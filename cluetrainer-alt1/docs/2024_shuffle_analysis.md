## Slider Shuffle Change - Analyzing the Data

Last Monday, the long awaited change to the shuffle algorithm of slider puzzles in hard and elite clues finally released. The puzzles are now noticably eaiser to solve, both for humans and automated solvers like Clue Trainer. Since the update released, I have collected thousands of real slider shuffles using Clue Trainer's crowdsourcing feature to analyze them and see, what impact this change actually had. Given the number of posts about this topic in the subreddit, I decided to do this writeup.

This post will analyze both the specifics of the old and new shuffle algorithm, as well as provide numbers about the number of steps puzzles with the old and new shuffle algorithm take to solve using various solving algorithms.

## TL/DR: The hard numbers


## Terminology



If you're interested in the details, read ahead. Otherwise, with this terminology you can scroll down to the TL/DR.

## Analyzing the shuffle

A particular configuration of a slider puzzle is described by a permutation of the 25 tiles including the blank. This means there are 25! = 15.1x10^24 possible configurations, only half of which are solvable. 

The tiles can be numbered from 0 to 24. The same is true for the positions on the puzzle, which can also be numbered from 0 to 24. To gain insight into how puzzles are shuffled, for each pair of tile T and position P, we can calculate the probability for T to be in position P in the starting configuration. We can visualize this in a 5 by 5 grid of individual 5 by 5 grids to show the probability of each tile.

### The old shuffle

I already did this for the old shuffle algorithm using crowdsourced data a few months ago. By now, more than 230.000 data points were collected, resulting in the following diagram:

A few interesting things to note about this:
- The blank tile always starts in the bottom right corner.
- Tiles of the top row always start in the two top-most rows.
- All tiles are biased towards not starting in the correct position.

It is evident that the old shuffle algorithm places tiles in a wide variety of positions. Except for the top row, tiles are close to uniformly distributed on the entire board, resulting in puzzles that are relatively complicated to solve.


### The new shuffle

For the updated shuffle, the dataset is smaller, but still large enough to be significant. Here is the result of the same visualization:

<b>TODO: INSERT IMAGE</b>





## Solving the shuffles
We do not know for sure how many users use Alt 1 to solve their slider puzzles, but given the fact that Clue Trainer has around 1,000 unique daily users, I think it is fair to assume that most people use automated solvers like Clue Solver or Clue Trainer.

Before we go on, we need to clear up some terminology:

Single Tile Moves (STM): Single tile moves are moves that move exactly one of the up to 4 tiles directly adjacent to the blank tile onto the blank spot. Every press of an arrow key is a STM, making this metric relevant for keyboard users. The move counts in Alt 1's builtin Clue Solver always are in the STM metric.

Multi Tile Moves (MTM): Multi tile moves refer to all moves possible by clicking on any tile in the same row or column as the blank tile, shifting all tiles between the blank tile and the clicked tile. This makes this metric relevant for users that use the mouse to solve sliders. When in mouse mode, Clue Trainer works with the MTM metric.

Slider Puzzles are an implementation of the so called 24 puzzle. Finding the shortest sequence of moves that solve a given puzzle configuration is an NP-hard problem, meaning that there is no efficient algorithm that does this. Every solving algorithm tries to found as good of a solution as possible within a certain time limit.

Solving slider puzzles can be understood as a pathfinding algorithm on a very large graph, where each node is one of the 15.5x^10^24 configurations and each edge is a move that connects two configurations. Because of the size of the search space, traditional efficient pathfinding algorithms are not viable.

As of right now, there are 2 solving algorithms that are worth considering:
1. Skillbert's "random" solver. This is a semi-randomized search algorithm that uses the best solution is found within the given time limit. This was implemented by Skillbert (author of Alt 1 and the builtin apps), and also originally powered the slider solver in Clue Trainer.
2. The PDB-Solver by me and discord user Shao. This is the (new) solving algorithm used in Clue Trainer. PDB is short for Pattern DataBase, and refers to a large lookup table that can be used to precompute partial solutions for slider puzzles. Without going into too much detail (maybe another time, since this is very interesting), this algorithm is the result of multiple weeks of work and optimization to get this to work with the CPU and memory constraints of the Alt 1 web browser. It resulted in a **30%** reduction for multi tile moves, and a **10%** reduction for single tile moves, while needing much less time.

Side note: We are currently looking into whether utilizing an optimal algorithm called Iterative Deepening A* (IDA*) is viable with the new shuffles, but the results of this are still pending.

To evaluate the solvers on both the old and the new shuffle algorithm, we let them solve a random sample of puzzles and analyze some statistical data