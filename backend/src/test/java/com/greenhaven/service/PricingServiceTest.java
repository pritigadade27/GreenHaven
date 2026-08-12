package com.greenhaven.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import com.greenhaven.entity.Coupon;

class PricingServiceTest {
    private final PricingService pricing = new PricingService(BigDecimal.ZERO);
    private final PricingService taxed = new PricingService(new BigDecimal("18"));

    private static Coupon percent(String value, String cap) {
        Coupon c = new Coupon();
        c.setDiscountType(Coupon.PERCENT);
        c.setDiscountValue(new BigDecimal(value));
        if (cap != null) c.setMaxDiscount(new BigDecimal(cap));
        return c;
    }

    private static Coupon flat(String value) {
        Coupon c = new Coupon();
        c.setDiscountType(Coupon.FLAT);
        c.setDiscountValue(new BigDecimal(value));
        return c;
    }

    @Nested
    @DisplayName("without a coupon")
    class Plain {
        @Test
        @DisplayName("delivery is charged below the threshold")
        void deliveryChargedBelowThreshold() {
            PricingService.Totals t = pricing.price(new BigDecimal("500"), null);
            assertThat(t.shipping()).isEqualByComparingTo("99");
            assertThat(t.total()).isEqualByComparingTo("599");
        }

        @Test
        @DisplayName("delivery is free at and above the threshold")
        void deliveryFreeAtThreshold() {
            assertThat(pricing.price(new BigDecimal("999"), null).shipping())
                    .isEqualByComparingTo("0");
            assertThat(pricing.price(new BigDecimal("1500"), null).shipping())
                    .isEqualByComparingTo("0");
        }

        @Test
        @DisplayName("no coupon means no discount")
        void noDiscount() {
            assertThat(pricing.price(new BigDecimal("1200"), null).discount())
                    .isEqualByComparingTo("0");
        }
    }

    @Nested
    @DisplayName("discounts")
    class Discounts {
        @Test
        @DisplayName("a percentage comes off the goods")
        void percentage() {
            PricingService.Totals t = pricing.price(new BigDecimal("2000"), percent("20", null));
            assertThat(t.discount()).isEqualByComparingTo("400");
            assertThat(t.total()).isEqualByComparingTo("1600");
        }

        @Test
        @DisplayName("a cap limits a percentage")
        void percentageCapped() {
            assertThat(pricing.price(new BigDecimal("5000"), percent("20", "300")).discount())
                    .isEqualByComparingTo("300");
        }

        @Test
        @DisplayName("a flat discount never exceeds the goods")
        void flatNeverExceedsGoods() {
            PricingService.Totals t = pricing.price(new BigDecimal("300"), flat("500"));
            assertThat(t.discount()).isEqualByComparingTo("300");
            assertThat(t.total()).isGreaterThanOrEqualTo(BigDecimal.ZERO);
        }

        @Test
        @DisplayName("rounding is to the paisa")
        void roundsToPaisa() {
            assertThat(pricing.price(new BigDecimal("1198"), percent("15", null)).discount())
                    .isEqualByComparingTo("179.70");
            assertThat(pricing.price(new BigDecimal("100"), percent("33", null)).discount())
                    .isEqualByComparingTo("33.00");
        }
    }

    @Nested
    @DisplayName("the order of operations")
    class Ordering {
        @Test
        @DisplayName("a discount never costs the customer their free delivery")
        void discountKeepsFreeDelivery() {
            PricingService.Totals t = pricing.price(new BigDecimal("1200"), percent("70", null));
            assertThat(t.shipping()).isEqualByComparingTo("0");
            assertThat(t.total()).isEqualByComparingTo("360");
        }

        @Test
        @DisplayName("a free-shipping coupon waives the fee on a small basket")
        void freeShippingCoupon() {
            Coupon c = flat("1");
            c.setFreeShipping(true);
            assertThat(pricing.price(new BigDecimal("300"), c).shipping())
                    .isEqualByComparingTo("0");
        }

        @Test
        @DisplayName("tax is charged on the discounted goods, not the full price")
        void taxFollowsTheDiscount() {
            PricingService.Totals t = taxed.price(new BigDecimal("1000"), percent("20", null));
            assertThat(t.discount()).isEqualByComparingTo("200");
            assertThat(t.tax()).isEqualByComparingTo("144.00");
            assertThat(t.total()).isEqualByComparingTo("944.00");
        }

        @Test
        @DisplayName("tax is not charged on delivery")
        void taxExcludesDelivery() {
            PricingService.Totals t = taxed.price(new BigDecimal("500"), null);
            assertThat(t.tax()).isEqualByComparingTo("90.00");
            assertThat(t.total()).isEqualByComparingTo("689.00");
        }
    }
}
