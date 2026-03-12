import {CompassReader} from "../CompassReader";

export interface CapturedCompass {
  getAngle(): CompassReader.AngleResult
  isArcCompass(): boolean
}