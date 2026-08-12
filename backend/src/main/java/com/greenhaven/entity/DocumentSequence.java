package com.greenhaven.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

/** The counter behind order and invoice numbers. */
@Entity
@Table(name = "document_sequence")
@IdClass(DocumentSequence.Key.class)
public class DocumentSequence {

    public static class Key implements java.io.Serializable {
        private String name;
        private Integer year;

        public Key() { }

        public Key(String name, Integer year) {
            this.name = name;
            this.year = year;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof Key other)) return false;
            return java.util.Objects.equals(name, other.name)
                    && java.util.Objects.equals(year, other.year);
        }

        @Override
        public int hashCode() {
            return java.util.Objects.hash(name, year);
        }
    }

    @Id
    @Column(nullable = false, length = 32)
    private String name;

    @Id
    @Column(nullable = false)
    private Integer year;

    @Column(name = "next_value", nullable = false)
    private Long nextValue = 1L;

    public DocumentSequence() { }

    public DocumentSequence(String name, Integer year, Long nextValue) {
        this.name = name;
        this.year = year;
        this.nextValue = nextValue;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Integer getYear() { return year; }
    public void setYear(Integer year) { this.year = year; }

    public Long getNextValue() { return nextValue; }
    public void setNextValue(Long nextValue) { this.nextValue = nextValue; }
}
