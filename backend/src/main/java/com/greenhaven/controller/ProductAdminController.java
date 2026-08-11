package com.greenhaven.controller;

import java.security.Principal;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.greenhaven.dto.ProductAdminDtos;
import com.greenhaven.service.AdminAuditService;
import com.greenhaven.service.ProductAdminService;
import com.greenhaven.service.UploadService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

/**
 * Product management.
 *
 *   POST   /api/admin/products             create
 *   PUT    /api/admin/products/{id}        edit
 *   PATCH  /api/admin/products/{id}/listing  discontinue / restore
 *   DELETE /api/admin/products/{id}        delete, or discontinue if it has sold
 *   POST   /api/admin/products/image       upload a photograph
 *
 * Under /api/admin, so the existing rule already requires ROLE_ADMIN; the
 * annotation states it locally as well because this endpoint writes the
 * catalogue every customer sees.
 */
@RestController
@RequestMapping("/api/admin/products")
@PreAuthorize("hasRole('ADMIN')")
public class ProductAdminController {

    private final ProductAdminService products;
    private final UploadService uploads;
    private final AdminAuditService audit;

    public ProductAdminController(ProductAdminService products, UploadService uploads,
                                  AdminAuditService audit) {
        this.products = products;
        this.uploads = uploads;
        this.audit = audit;
    }

    @PostMapping
    public ResponseEntity<ProductAdminDtos.ProductRow> create(
            Principal principal, @Valid @RequestBody ProductAdminDtos.ProductRequest body,
            HttpServletRequest http) {
        ProductAdminDtos.ProductRow row = products.create(body);
        audit.record(principal.getName(), AdminAuditService.PRODUCT_ADDED, "PRODUCT",
                String.valueOf(row.id()), row.name() + " (" + row.slug() + ")", http);
        return ResponseEntity.status(HttpStatus.CREATED).body(row);
    }

    @PutMapping("/{id}")
    public ProductAdminDtos.ProductRow update(
            Principal principal, @PathVariable Long id,
            @Valid @RequestBody ProductAdminDtos.ProductRequest body, HttpServletRequest http) {
        ProductAdminDtos.ProductRow row = products.update(id, body);
        audit.record(principal.getName(), AdminAuditService.PRODUCT_UPDATED, "PRODUCT",
                String.valueOf(id), row.name(), http);
        return row;
    }

    @PatchMapping("/{id}/listing")
    public ProductAdminDtos.ProductRow setListing(
            Principal principal, @PathVariable Long id,
            @RequestParam boolean discontinued, HttpServletRequest http) {
        ProductAdminDtos.ProductRow row = products.setDiscontinued(id, discontinued);
        audit.record(principal.getName(), AdminAuditService.PRODUCT_UPDATED, "PRODUCT",
                String.valueOf(id), discontinued ? "discontinued" : "restored to the shop", http);
        return row;
    }

    @DeleteMapping("/{id}")
    public ProductAdminDtos.DeleteOutcome delete(Principal principal, @PathVariable Long id,
                                                 HttpServletRequest http) {
        ProductAdminDtos.DeleteOutcome outcome = products.delete(id);
        audit.record(principal.getName(),
                outcome.deleted() ? AdminAuditService.PRODUCT_DELETED : AdminAuditService.PRODUCT_UPDATED,
                "PRODUCT", String.valueOf(id), outcome.message(), http);
        return outcome;
    }

    @PutMapping("/{id}/gallery")
    public java.util.List<String> setGallery(Principal principal, @PathVariable Long id,
                                             @RequestBody java.util.Map<String, java.util.List<String>> body,
                                             HttpServletRequest http) {
        java.util.List<String> urls = products.setGallery(id, body.get("urls"));
        audit.record(principal.getName(), AdminAuditService.PRODUCT_UPDATED, "PRODUCT",
                String.valueOf(id), urls.size() + " extra photograph(s)", http);
        return urls;
    }

    /**
     * Uploads one photograph and returns the path to store on a product. Kept
     * separate from create/update so an image can be attached before the
     * product exists, and so a failed upload never loses a half-typed form.
     */
    @PostMapping(value = "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ProductAdminDtos.UploadResult upload(Principal principal,
                                                @RequestPart("file") MultipartFile file,
                                                HttpServletRequest http) {
        String url = uploads.storeProductImage(file);
        audit.record(principal.getName(), AdminAuditService.PRODUCT_UPDATED, "IMAGE", url,
                "uploaded " + file.getSize() + " bytes", http);
        return new ProductAdminDtos.UploadResult(url);
    }
}
