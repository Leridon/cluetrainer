import {ScuffedTesting} from "./test_framework";
import {test_slide_reader} from "./test_slide_reader";
import {test_slider_moves} from "./test_slider_moves";
import testset = ScuffedTesting.testset;
import {test_knot_solver} from "./test_knot_solver";
import {test_math} from "./test_math";
import {test_prototype_transform} from "./test_prototype_transform";

export const clue_trainer_test_set = testset("Cluetrainer",
  test_slide_reader,
  test_knot_solver,
  test_slider_moves,
  test_math,
  test_prototype_transform
)