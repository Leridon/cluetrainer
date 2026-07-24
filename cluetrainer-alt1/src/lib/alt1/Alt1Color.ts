import {mixColor, unmixColor} from "alt1";

export class Alt1Color {
  private constructor(
    public readonly for_overlay: number,
    public readonly css_string: string
  ) {}

  public static fromHex(hex: string): Alt1Color {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

    const r = parseInt(result[1], 16)
    const g = parseInt(result[2], 16)
    const b = parseInt(result[3], 16)

    return new Alt1Color(mixColor(r, g, b), hex)
  }

  public static fromNumber(value: number): Alt1Color {
    const [r, g, b] = unmixColor(value)

    function componentToHex(c: number) {
      const hex = c.toString(16);
      return hex.length == 1 ? "0" + hex : hex;
    }

    return new Alt1Color(value, "#" + componentToHex(r) + componentToHex(g) + componentToHex(b))
  }

  public static fromRGB(r: number, g: number, b: number): Alt1Color {
    return this.fromNumber(mixColor(r, g, b))
  }
}

export namespace Alt1Color {
  export const black = Alt1Color.fromHex("#010101") // #000000 is considered transparent!
  export const gray = Alt1Color.fromHex("#808080") // #000000 is considered transparent!
  export const white = Alt1Color.fromHex("#FFFFFF")
  export const red = Alt1Color.fromHex("#FF0000")
  export const green = Alt1Color.fromHex("#00FF00")
  export const blue = Alt1Color.fromHex("#0000FF")
  export const yellow = Alt1Color.fromHex("#FFFF00")
  export const magenta = Alt1Color.fromHex("#FF00FF")
  export const cyan = Alt1Color.fromHex("#00FFFF")
}