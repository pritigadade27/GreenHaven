package com.greenhaven.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.greenhaven.entity.Address;

public interface AddressRepository extends JpaRepository<Address, Long> {
    List<Address> findByUserIdOrderByDefaultAddressDescIdDesc(Long userId);

    Optional<Address> findByIdAndUserId(Long id, Long userId);

    long countByUserId(Long userId);

    Optional<Address> findFirstByUserIdAndDefaultAddressTrue(Long userId);

    @Modifying
    @Query("UPDATE Address a SET a.defaultAddress = false "
            + "WHERE a.user.id = :userId AND a.id <> :keep")
    void clearDefaultExcept(@Param("userId") Long userId, @Param("keep") Long keep);
}
