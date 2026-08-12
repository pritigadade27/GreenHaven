package com.greenhaven.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.greenhaven.dto.ProfileDtos;
import com.greenhaven.exception.ResourceNotFoundException;
import com.greenhaven.entity.Address;
import com.greenhaven.entity.AppUser;
import com.greenhaven.repository.AddressRepository;
import com.greenhaven.repository.AppUserRepository;

@Service
public class AddressService {
    private static final int MAX_PER_USER = 12;

    private final AddressRepository addresses;
    private final AppUserRepository users;

    public AddressService(AddressRepository addresses, AppUserRepository users) {
        this.addresses = addresses;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<ProfileDtos.AddressDto> list(String email) {
        return addresses.findByUserIdOrderByDefaultAddressDescIdDesc(user(email).getId())
                .stream().map(AddressService::toDto).toList();
    }

    @Transactional
    public ProfileDtos.AddressDto add(String email, ProfileDtos.AddressRequest request) {
        AppUser owner = user(email);
        if (addresses.countByUserId(owner.getId()) >= MAX_PER_USER) {
            throw new IllegalArgumentException(
                    "You can save up to " + MAX_PER_USER + " addresses. Remove one first.");
        }

        Address row = new Address();
        row.setUser(owner);
        apply(row, request);

        boolean first = addresses.countByUserId(owner.getId()) == 0;
        row.setDefaultAddress(first || request.makeDefault());

        Address saved = addresses.save(row);
        if (saved.isDefaultAddress()) {
            addresses.clearDefaultExcept(owner.getId(), saved.getId());
        }
        return toDto(saved);
    }

    @Transactional
    public ProfileDtos.AddressDto update(String email, Long id, ProfileDtos.AddressRequest request) {
        AppUser owner = user(email);
        Address row = owned(owner, id);
        apply(row, request);

        if (request.makeDefault()) {
            row.setDefaultAddress(true);
        }
        Address saved = addresses.save(row);
        if (saved.isDefaultAddress()) {
            addresses.clearDefaultExcept(owner.getId(), saved.getId());
        }
        return toDto(saved);
    }

    @Transactional
    public void delete(String email, Long id) {
        AppUser owner = user(email);
        Address row = owned(owner, id);
        boolean wasDefault = row.isDefaultAddress();
        addresses.delete(row);

        if (wasDefault) {
            addresses.findByUserIdOrderByDefaultAddressDescIdDesc(owner.getId()).stream()
                    .findFirst()
                    .ifPresent(next -> {
                        next.setDefaultAddress(true);
                        addresses.save(next);
                    });
        }
    }

    @Transactional
    public ProfileDtos.AddressDto makeDefault(String email, Long id) {
        AppUser owner = user(email);
        Address row = owned(owner, id);
        row.setDefaultAddress(true);
        Address saved = addresses.save(row);
        addresses.clearDefaultExcept(owner.getId(), saved.getId());
        return toDto(saved);
    }

    private static void apply(Address row, ProfileDtos.AddressRequest r) {
        row.setLabel(blankToNull(r.label()) == null ? "Home" : r.label().trim());
        row.setFullName(r.fullName().trim());
        row.setPhone(r.phone().trim());
        row.setLine1(r.line1().trim());
        row.setLine2(blankToNull(r.line2()));
        row.setCity(r.city().trim());
        row.setState(r.state().trim());
        row.setPincode(r.pincode().trim());
        row.setCountry(blankToNull(r.country()) == null ? "India" : r.country().trim());
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private Address owned(AppUser owner, Long id) {
        return addresses.findByIdAndUserId(id, owner.getId())
                .orElseThrow(() -> new ResourceNotFoundException("No such saved address."));
    }

    static ProfileDtos.AddressDto toDto(Address a) {
        return new ProfileDtos.AddressDto(a.getId(), a.getLabel(), a.getFullName(), a.getPhone(),
                a.getLine1(), a.getLine2(), a.getCity(), a.getState(), a.getPincode(),
                a.getCountry(), a.isDefaultAddress());
    }

    private AppUser user(String email) {
        return users.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Not signed in."));
    }
}
