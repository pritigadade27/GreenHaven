package com.greenhaven.controller;

import java.security.Principal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.greenhaven.dto.ApiMessage;
import com.greenhaven.dto.ProfileDtos;
import com.greenhaven.service.AddressService;

import jakarta.validation.Valid;

/**
 * Saved delivery addresses, scoped to the caller.
 *
 * Deleting one never touches an order: each order keeps its own copy of where
 * it was sent, so history stays true whatever the customer does here.
 */
@RestController
@RequestMapping("/api/addresses")
public class AddressController {

    private final AddressService addresses;

    public AddressController(AddressService addresses) {
        this.addresses = addresses;
    }

    @GetMapping
    public List<ProfileDtos.AddressDto> list(Principal principal) {
        return addresses.list(principal.getName());
    }

    @PostMapping
    public ResponseEntity<ProfileDtos.AddressDto> add(
            Principal principal, @Valid @RequestBody ProfileDtos.AddressRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(addresses.add(principal.getName(), body));
    }

    @PutMapping("/{id}")
    public ProfileDtos.AddressDto update(Principal principal, @PathVariable Long id,
                                         @Valid @RequestBody ProfileDtos.AddressRequest body) {
        return addresses.update(principal.getName(), id, body);
    }

    @PostMapping("/{id}/default")
    public ProfileDtos.AddressDto makeDefault(Principal principal, @PathVariable Long id) {
        return addresses.makeDefault(principal.getName(), id);
    }

    @DeleteMapping("/{id}")
    public ApiMessage delete(Principal principal, @PathVariable Long id) {
        addresses.delete(principal.getName(), id);
        return new ApiMessage("That address has been removed. Past orders are unaffected.");
    }
}
