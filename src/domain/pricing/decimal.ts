const DECIMAL_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;

function powerOfTen(exponent: number) {
  return BigInt(`1${"0".repeat(exponent)}`);
}

function normalize(coefficient: bigint, scale: number) {
  let normalizedCoefficient = coefficient;
  let normalizedScale = scale;

  while (normalizedScale > 0 && normalizedCoefficient % BigInt(10) === BigInt(0)) {
    normalizedCoefficient /= BigInt(10);
    normalizedScale -= 1;
  }

  return { coefficient: normalizedCoefficient, scale: normalizedScale };
}

export class Decimal {
  private constructor(
    private readonly coefficient: bigint,
    private readonly scale: number
  ) {}

  static parse(value: string) {
    if (!DECIMAL_PATTERN.test(value)) {
      throw new Error(`Invalid decimal value: ${value}`);
    }

    const negative = value.startsWith("-");
    const unsigned = negative ? value.slice(1) : value;
    const [whole, fraction = ""] = unsigned.split(".");
    const coefficient = BigInt(`${negative ? "-" : ""}${whole}${fraction}`);
    const normalized = normalize(coefficient, fraction.length);

    return new Decimal(normalized.coefficient, normalized.scale);
  }

  static zero() {
    return new Decimal(BigInt(0), 0);
  }

  static one() {
    return new Decimal(BigInt(1), 0);
  }

  add(other: Decimal) {
    const scale = Math.max(this.scale, other.scale);
    const left = this.coefficient * powerOfTen(scale - this.scale);
    const right = other.coefficient * powerOfTen(scale - other.scale);
    const normalized = normalize(left + right, scale);

    return new Decimal(normalized.coefficient, normalized.scale);
  }

  half() {
    if (this.coefficient % BigInt(2) === BigInt(0)) {
      return new Decimal(this.coefficient / BigInt(2), this.scale);
    }

    return new Decimal(this.coefficient * BigInt(5), this.scale + 1);
  }

  compare(other: Decimal) {
    const scale = Math.max(this.scale, other.scale);
    const left = this.coefficient * powerOfTen(scale - this.scale);
    const right = other.coefficient * powerOfTen(scale - other.scale);

    return left < right ? -1 : left > right ? 1 : 0;
  }

  multiplyIntegerAndRound(value: bigint) {
    const numerator = value * this.coefficient;
    const denominator = powerOfTen(this.scale);
    const quotient = numerator / denominator;
    const remainder = numerator % denominator;
    const absoluteRemainder = remainder < BigInt(0) ? -remainder : remainder;
    const roundsAwayFromZero = absoluteRemainder * BigInt(2) >= denominator;

    if (!roundsAwayFromZero) return quotient;
    return quotient + (numerator < BigInt(0) ? BigInt(-1) : BigInt(1));
  }

  isNegative() {
    return this.coefficient < BigInt(0);
  }

  isZero() {
    return this.coefficient === BigInt(0);
  }

  toString() {
    const negative = this.coefficient < BigInt(0);
    const digits = (negative ? -this.coefficient : this.coefficient).toString();

    if (this.scale === 0) return `${negative ? "-" : ""}${digits}`;

    const padded = digits.padStart(this.scale + 1, "0");
    const whole = padded.slice(0, -this.scale);
    const fraction = padded.slice(-this.scale);
    return `${negative ? "-" : ""}${whole}.${fraction}`;
  }
}
