package com.greenhaven;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;

import com.greenhaven.mapper.PlantMapper;
import com.greenhaven.payment.PaymentService;

/**
 * Proves the whole application wires up.
 *
 * A context-load test catches an entire class of failure no unit test can: a
 * bean that cannot be constructed, a circular dependency, a repository Spring
 * Data cannot implement, or an entity Hibernate cannot map. It is the cheapest
 * test in the project and the one most likely to fail after a refactor.
 */
@SpringBootTest
class GreenHavenApplicationTests {

    @Autowired
    private ApplicationContext context;

    @Test
    @DisplayName("the application context loads")
    void contextLoads() {
        assertThat(context).isNotNull();
    }

    @Test
    @DisplayName("every layer is present in the context")
    void everyLayerIsWired() {
        // One representative bean per package, so a package that stopped being
        // scanned shows up here rather than as a 500 in production.
        assertThat(context.getBeansWithAnnotation(org.springframework.web.bind.annotation.RestController.class))
                .as("controllers").isNotEmpty();
        assertThat(context.getBeansWithAnnotation(org.springframework.stereotype.Service.class))
                .as("services").isNotEmpty();
        assertThat(context.getBeansOfType(org.springframework.data.jpa.repository.JpaRepository.class))
                .as("repositories").isNotEmpty();
    }

    @Test
    @DisplayName("the classes moved during the Eclipse restructure are still wired")
    void movedClassesAreWired() {
        // PlantMapper and PaymentService were moved out of the service package.
        // Both were referenced from the same package without an import, so this
        // is exactly where that refactor could have quietly broken.
        assertThat(context.getBean(PlantMapper.class)).isNotNull();
        assertThat(context.getBean(PaymentService.class)).isNotNull();
    }
}
