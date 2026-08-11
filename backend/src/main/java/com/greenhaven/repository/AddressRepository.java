package com.greenhaven.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.greenhaven.model.Address;

public interface AddressRepository extends JpaRepository<Address, Long> {

    /** Default first, then newest — the order the customer sees them in. */
    List<Address> findByUserIdOrderByDefaultAddressDescIdDesc(Long userId);

    Optional<Address> findByIdAndUserId(Long id, Long userId);

    long countByUserId(Long userId);

    Optional<Address> findFirstByUserIdAndDefaultAddressTrue(Long userId);

    /**
     * Clears the flag on every other address in one statement. Reading them all
     * and saving them back would work too, but this cannot leave two rows
     * flagged if it fails halfway.
     */
    @Modifying
    @Query("UPDATE Address a SET a.defaultAddress = false "
            + "WHERE a.user.id = :userId AND a.id <> :keep")
    void clearDefaultExcept(@Param("userId") Long userId, @Param("keep") Long keep);
}
