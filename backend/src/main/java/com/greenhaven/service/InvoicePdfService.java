package com.greenhaven.service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.greenhaven.model.Order;
import com.greenhaven.model.OrderItem;
import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;

/**
 * Renders an order as a downloadable invoice.
 *
 * Every figure is read from the order row, never recalculated: an invoice is a
 * record of what was charged, and a document that quietly re-prices itself
 * against today's catalogue is worse than no document at all.
 */
@Service
public class InvoicePdfService {

    private static final java.awt.Color BURGUNDY = new java.awt.Color(0x6D, 0x00, 0x08);
    private static final java.awt.Color ROSE = new java.awt.Color(0xBF, 0x05, 0x13);
    private static final java.awt.Color INK = new java.awt.Color(0x2B, 0x1B, 0x1E);
    private static final java.awt.Color MUTED = new java.awt.Color(0x7A, 0x6A, 0x6D);
    private static final java.awt.Color HAIRLINE = new java.awt.Color(0xE6, 0xD8, 0xDA);
    private static final java.awt.Color WASH = new java.awt.Color(0xFF, 0xF3, 0xF4);

    private static final Font H1 = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, BURGUNDY);
    private static final Font H2 = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, BURGUNDY);
    private static final Font LABEL = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, MUTED);
    private static final Font BODY = FontFactory.getFont(FontFactory.HELVETICA, 9.5f, INK);
    private static final Font BODY_BOLD = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9.5f, INK);
    private static final Font SMALL = FontFactory.getFont(FontFactory.HELVETICA, 8, MUTED);
    private static final Font TOTAL = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, BURGUNDY);

    private static final DateTimeFormatter STAMP =
            DateTimeFormatter.ofPattern("d MMMM yyyy, h:mm a").withZone(ZoneId.of("Asia/Kolkata"));

    private final String businessName;
    private final String businessAddress;
    private final String businessEmail;
    private final String businessPhone;
    private final String gstin;

    public InvoicePdfService(
            @Value("${greenhaven.invoice.business-name:Green Haven}") String businessName,
            @Value("${greenhaven.invoice.address:Pune, Maharashtra, India}") String businessAddress,
            @Value("${greenhaven.invoice.email:hello@greenhaven.in}") String businessEmail,
            @Value("${greenhaven.invoice.phone:+91 90000 00000}") String businessPhone,
            @Value("${greenhaven.invoice.gstin:}") String gstin) {
        this.businessName = businessName;
        this.businessAddress = businessAddress;
        this.businessEmail = businessEmail;
        this.businessPhone = businessPhone;
        this.gstin = gstin;
    }

    public byte[] render(Order order) {
        return render(order, null);
    }

    /**
     * Renders one document for an order.
     *
     * `issued` names which — the invoice, or a credit note offsetting it. Null
     * means the invoice, so every existing caller keeps working. A credit note
     * shares the whole layout on purpose: it is the same transaction seen from
     * the other side, and a reader should be able to lay the two side by side.
     */
    public byte[] render(Order order, com.greenhaven.model.Invoice issued) {
        boolean credit = issued != null && issued.isCreditNote();
        String number = issued != null ? issued.getNumber() : order.getInvoiceNumber();

        Document doc = new Document(PageSize.A4, 42, 42, 44, 46);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(doc, out);
            doc.addTitle((credit ? "Credit note " : "Invoice ") + number);
            doc.addAuthor(businessName);
            doc.open();

            doc.add(header(order, issued));
            if (credit) {
                doc.add(spacer(14));
                doc.add(creditBanner(issued, order));
            }
            doc.add(spacer(16));
            doc.add(parties(order));
            doc.add(spacer(16));
            doc.add(lineItems(order));
            doc.add(spacer(10));
            doc.add(totals(order));
            doc.add(spacer(16));
            doc.add(paymentBlock(order));
            doc.add(spacer(20));
            doc.add(footer());

            doc.close();
        } catch (Exception e) {
            // The caller is a download endpoint; there is no partial PDF worth
            // sending, so this surfaces as a 503 rather than a broken file.
            throw new IllegalStateException("Could not produce the invoice PDF.", e);
        }
        return out.toByteArray();
    }

    /**
     * The line that stops a credit note being mistaken for a bill.
     *
     * Without it the document looks exactly like an invoice with a different
     * number at the top, and somebody will pay it twice.
     */
    private PdfPTable creditBanner(com.greenhaven.model.Invoice note, Order order) {
        PdfPTable t = new PdfPTable(1);
        t.setWidthPercentage(100);
        PdfPCell cell = tinted();
        cell.addElement(new Paragraph(
                "This is a credit note, not a request for payment.", BODY_BOLD));
        cell.addElement(new Paragraph(
                "It cancels invoice " + order.getInvoiceNumber()
                        + " and records " + money(note.getAmount()) + " owed back to you.", SMALL));
        if (note.getReason() != null) {
            cell.addElement(new Paragraph("Reason: " + note.getReason(), SMALL));
        }
        t.addCell(cell);
        return t;
    }

    private PdfPTable header(Order order, com.greenhaven.model.Invoice issued) {
        boolean credit = issued != null && issued.isCreditNote();
        PdfPTable t = new PdfPTable(new float[] { 1.4f, 1f });
        t.setWidthPercentage(100);

        PdfPCell left = bare();
        left.addElement(new Paragraph(businessName, H1));
        left.addElement(new Paragraph(businessAddress, SMALL));
        left.addElement(new Paragraph(businessEmail + "  ·  " + businessPhone, SMALL));
        if (!gstin.isBlank()) {
            left.addElement(new Paragraph("GSTIN " + gstin, SMALL));
        }
        t.addCell(left);

        PdfPCell right = bare();
        right.setHorizontalAlignment(Element.ALIGN_RIGHT);
        // "TAX INVOICE" is a claim about the document, so it is only made when
        // tax was actually charged. Calling a zero-tax receipt a tax invoice
        // misrepresents it to anyone who files it.
        right.addElement(right(new Paragraph(
                credit ? "CREDIT NOTE" : isPositive(order.getTax()) ? "TAX INVOICE" : "INVOICE",
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, ROSE))));
        right.addElement(right(new Paragraph(
                credit ? issued.getNumber() : order.getInvoiceNumber(), BODY_BOLD)));
        right.addElement(right(new Paragraph("Order " + order.getOrderNumber(), SMALL)));
        java.time.Instant stamped = credit ? issued.getIssuedAt() : order.getPlacedAt();
        right.addElement(right(new Paragraph(stamped == null ? "" : STAMP.format(stamped), SMALL)));
        t.addCell(right);
        return t;
    }

    private PdfPTable parties(Order order) {
        PdfPTable t = new PdfPTable(new float[] { 1f, 1f });
        t.setWidthPercentage(100);
        t.setSpacingBefore(4);

        PdfPCell billed = tinted();
        billed.addElement(new Paragraph("BILLED TO", LABEL));
        billed.addElement(new Paragraph(order.getUser().getFullName(), BODY_BOLD));
        billed.addElement(new Paragraph(order.getUser().getEmail(), SMALL));
        if (order.getPhone() != null) {
            billed.addElement(new Paragraph(order.getPhone(), SMALL));
        }
        t.addCell(billed);

        PdfPCell shipped = tinted();
        shipped.addElement(new Paragraph("DELIVERED TO", LABEL));
        shipped.addElement(new Paragraph(nullSafe(order.getAddressLine()), BODY));
        shipped.addElement(new Paragraph(
                nullSafe(order.getCity()) + " " + nullSafe(order.getPincode()), BODY));
        shipped.addElement(new Paragraph(
                nullSafe(order.getState()) + ", " + nullSafe(order.getCountry()), SMALL));
        t.addCell(shipped);
        return t;
    }

    private PdfPTable lineItems(Order order) {
        PdfPTable t = new PdfPTable(new float[] { 0.5f, 4f, 1.1f, 1.4f, 1.6f });
        t.setWidthPercentage(100);
        t.setHeaderRows(1);

        for (String head : new String[] { "#", "Item", "Qty", "Rate", "Amount" }) {
            PdfPCell h = new PdfPCell(new Phrase(head.toUpperCase(), LABEL));
            h.setBackgroundColor(WASH);
            h.setBorder(Rectangle.BOTTOM);
            h.setBorderColor(HAIRLINE);
            h.setPadding(7);
            h.setHorizontalAlignment(head.equals("#") || head.equals("Item")
                    ? Element.ALIGN_LEFT : Element.ALIGN_RIGHT);
            t.addCell(h);
        }

        int n = 1;
        for (OrderItem item : order.getItems()) {
            BigDecimal amount = item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
            t.addCell(cell(String.valueOf(n++), BODY, Element.ALIGN_LEFT));

            PdfPCell name = new PdfPCell();
            name.setBorder(Rectangle.BOTTOM);
            name.setBorderColor(HAIRLINE);
            name.setPadding(7);
            name.addElement(new Paragraph(
                    item.getProductName() != null ? item.getProductName() : "Product", BODY));
            if (item.getProductCategory() != null) {
                name.addElement(new Paragraph(item.getProductCategory(), SMALL));
            }
            t.addCell(name);

            t.addCell(cell(String.valueOf(item.getQuantity()), BODY, Element.ALIGN_RIGHT));
            t.addCell(cell(money(item.getUnitPrice()), BODY, Element.ALIGN_RIGHT));
            t.addCell(cell(money(amount), BODY_BOLD, Element.ALIGN_RIGHT));
        }
        return t;
    }

    private PdfPTable totals(Order order) {
        PdfPTable outer = new PdfPTable(new float[] { 1.4f, 1f });
        outer.setWidthPercentage(100);
        outer.addCell(bare());

        PdfPTable t = new PdfPTable(new float[] { 1.3f, 1f });
        t.setWidthPercentage(100);
        totalRow(t, "Subtotal", money(order.getSubtotal()), false);
        if (isPositive(order.getDiscount())) {
            // Named, not just deducted. An invoice showing an unexplained
            // deduction is the kind of thing that gets queried a year later.
            String label = order.getCouponCode() == null || order.getCouponCode().isBlank()
                    ? "Discount"
                    : "Discount (" + order.getCouponCode() + ")";
            totalRow(t, label, "-" + money(order.getDiscount()), false);
        }
        totalRow(t, "Delivery",
                isPositive(order.getShipping()) ? money(order.getShipping()) : "Free", false);
        if (isPositive(order.getTax())) {
            totalRow(t, "Tax", money(order.getTax()), false);
        }
        totalRow(t, "Total paid", money(order.getTotal()), true);

        PdfPCell wrap = bare();
        wrap.addElement(t);
        outer.addCell(wrap);
        return outer;
    }

    private static void totalRow(PdfPTable t, String label, String value, boolean strong) {
        PdfPCell l = new PdfPCell(new Phrase(label, strong ? H2 : BODY));
        PdfPCell v = new PdfPCell(new Phrase(value, strong ? TOTAL : BODY_BOLD));
        for (PdfPCell c : new PdfPCell[] { l, v }) {
            c.setBorder(strong ? Rectangle.TOP : Rectangle.NO_BORDER);
            c.setBorderColor(HAIRLINE);
            c.setPadding(6);
            c.setPaddingTop(strong ? 9 : 4);
        }
        v.setHorizontalAlignment(Element.ALIGN_RIGHT);
        t.addCell(l);
        t.addCell(v);
    }

    private PdfPTable paymentBlock(Order order) {
        PdfPTable t = new PdfPTable(new float[] { 1f, 1f, 1f });
        t.setWidthPercentage(100);

        t.addCell(fact("PAYMENT STATUS", order.getStatus()));
        t.addCell(fact("METHOD", order.getPaymentMethod() == null
                ? "Razorpay" : order.getPaymentMethod()));
        t.addCell(fact("PAYMENT ID", nullSafe(order.getRazorpayPaymentId())));
        t.addCell(fact("GATEWAY ORDER", nullSafe(order.getRazorpayOrderId())));
        t.addCell(fact("DELIVERY", order.getDeliveryStatus()));
        t.addCell(fact("ESTIMATED DELIVERY", order.getEstimatedDelivery() == null
                ? "—" : order.getEstimatedDelivery().toString()));
        return t;
    }

    private static PdfPCell fact(String label, String value) {
        PdfPCell c = tinted();
        c.addElement(new Paragraph(label, LABEL));
        c.addElement(new Paragraph(value, BODY));
        return c;
    }

    private Paragraph footer() {
        Paragraph p = new Paragraph();
        p.setAlignment(Element.ALIGN_CENTER);
        p.add(new Chunk("This is a computer-generated invoice and needs no signature.\n", SMALL));
        p.add(new Chunk(businessName + " — bringing nature to every home.", SMALL));
        return p;
    }

    private static PdfPCell bare() {
        PdfPCell c = new PdfPCell();
        c.setBorder(Rectangle.NO_BORDER);
        c.setPadding(0);
        return c;
    }

    private static PdfPCell tinted() {
        PdfPCell c = new PdfPCell();
        c.setBorder(Rectangle.BOX);
        c.setBorderColor(HAIRLINE);
        c.setBackgroundColor(WASH);
        c.setPadding(9);
        return c;
    }

    private static PdfPCell cell(String text, Font font, int align) {
        PdfPCell c = new PdfPCell(new Phrase(text, font));
        c.setBorder(Rectangle.BOTTOM);
        c.setBorderColor(HAIRLINE);
        c.setPadding(7);
        c.setHorizontalAlignment(align);
        return c;
    }

    private static Paragraph right(Paragraph p) {
        p.setAlignment(Element.ALIGN_RIGHT);
        return p;
    }

    private static Paragraph spacer(float height) {
        Paragraph p = new Paragraph(" ");
        p.setLeading(height);
        return p;
    }

    /**
     * Rupees with an ASCII prefix rather than ₹. The base-14 PDF fonts are
     * Latin-1 only, and the glyph would silently drop out of the document.
     */
    private static String money(BigDecimal amount) {
        return "Rs. " + (amount == null ? BigDecimal.ZERO : amount).setScale(2,
                java.math.RoundingMode.HALF_UP).toPlainString();
    }

    private static boolean isPositive(BigDecimal v) {
        return v != null && v.compareTo(BigDecimal.ZERO) > 0;
    }

    private static String nullSafe(String s) {
        return s == null || s.isBlank() ? "—" : s;
    }
}
