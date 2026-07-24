import {CapturedImage} from "./CapturedImage";

export interface Finder<T> {
  find(img: CapturedImage): T | null
}