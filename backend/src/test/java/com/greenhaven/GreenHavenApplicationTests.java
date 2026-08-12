package com.greenhaven;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;

import com.greenhaven.mapper.PlantMapper;
import com.greenhaven.payment.PaymentService;

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
        assertThat(context.getBean(PlantMapper.class)).isNotNull();
        assertThat(context.getBean(PaymentService.class)).isNotNull();
    }
}
