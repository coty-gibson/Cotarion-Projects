import { Decimal } from "@/domain/pricing/decimal";

export const PRICING_CURRENCY = "USD" as const;
export type PricingCurrency = typeof PRICING_CURRENCY;

const USD_PATTERN = /^(?:0|[1-9]\d*)\.\d{2}$/;

export class Money {
  private constructor(
    private readonly minorUnits: bigint,
    readonly currency: PricingCurrency
  ) {}

  static usd(value: string) {
    if (!USD_PATTERN.test(value)) {
      throw new Error(`USD money must use a non-negative two-decimal value: ${value}`);
    }

    return new Money(BigInt(value.replace(".", "")), PRICING_CURRENCY);
  }

  static fromMinorUnits(minorUnits: bigint) {
    if (minorUnits < BigInt(0)) {
      throw new Error("Money cannot be negative.");
    }

    return new Money(minorUnits, PRICING_CURRENCY);
  }

  static zero() {
    return new Money(BigInt(0), PRICING_CURRENCY);
  }

  add(other: Money) {
    this.assertSameCurrency(other);
    return Money.fromMinorUnits(this.minorUnits + other.minorUnits);
  }

  subtract(other: Money) {
    this.assertSameCurrency(other);
    return Money.fromMinorUnits(this.minorUnits - other.minorUnits);
  }

  multiplyAndRound(multiplier: Decimal) {
    return Money.fromMinorUnits(multiplier.multiplyIntegerAndRound(this.minorUnits));
  }

  equals(other: Money) {
    return this.currency === other.currency && this.minorUnits === other.minorUnits;
  }

  toMinorUnits() {
    return this.minorUnits;
  }

  toString() {
    const digits = this.minorUnits.toString().padStart(3, "0");
    return `${digits.slice(0, -2)}.${digits.slice(-2)}`;
  }

  private assertSameCurrency(other: Money) {
    if (this.currency !== other.currency) {
      throw new Error("Money currencies must match.");
    }
  }
}
