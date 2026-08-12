package com.greenhaven.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import com.greenhaven.entity.Coupon;

/**
 * The arithmetic that decides what a customer is charged.
 *
 * Worth unit testing above everything else in the project: it is pure, it is
 * the only place money is calculated, and a mistake here is money — either
 * given away or wrongly taken.
 */
class PricingServiceTest {

    /** GST is 0 by default: live plants are exempt in India. */
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
            // 20% of 5000 is 1000, but the coupon promises at most 300.
            assertThat(pricing.price(new BigDecimal("5000"), percent("20", "300")).discount())
                    .isEqualByComparingTo("300");
        }

        @Test
        @DisplayName("a flat discount never exceeds the goods")
        void flatNeverExceedsGoods() {
            // A 500 code on a 300 basket must take 300, not 500 — otherwise the
            // balance comes out of delivery, or the gateway is sent a negative.
            PricingService.Totals t = pricing.price(new BigDecimal("300"), flat("500"));
            assertThat(t.discount()).isEqualByComparingTo("300");
            assertThat(t.total()).isGreaterThanOrEqualTo(BigDecimal.ZERO);
        }

        @Test
        @DisplayName("rounding is to the paisa")
        void roundsToPaisa() {
            // 15% of 1198 is 179.70 exactly; 33% of 100 is 33.00.
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
            // The basket qualified at 1200. A 70% code drops it to 360, which is
            // under the 999 threshold — but delivery must stay free. Adding 99
            // back would hand someone a worse total for using a discount code.
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
            // 18% of 1000 would be 180; after a 20% discount the goods are 800,
            // so the tax owed is 144. Taxing the pre-discount figure would
            // overcharge on money the customer never paid.
            PricingService.Totals t = taxed.price(new BigDecimal("1000"), percent("20", null));
            assertThat(t.discount()).isEqualByComparingTo("200");
            assertThat(t.tax()).isEqualByComparingTo("144.00");
            assertThat(t.total()).isEqualByComparingTo("944.00");
        }

        @Test
        @DisplayName("tax is not charged on delivery")
        void taxExcludesDelivery() {
            // 500 of goods plus 99 delivery. Tax is 18% of 500 = 90, not of 599.
            PricingService.Totals t = taxed.price(new BigDecimal("500"), null);
            assertThat(t.tax()).isEqualByComparingTo("90.00");
            assertThat(t.total()).isEqualByComparingTo("689.00");
        }
    }
}
