# token-radar-01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/mooohgaming/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/mooohgaming/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A pre-token radar: 198 standalone protocols that record no token, ranked by an
implied value computed from the snapshot's own figures — TVL, seven-day growth
and how long each has run with no token. Wrapped, staked and bridged products
are not ranked, and protocols whose token already trades are set aside in a
separate Live view with their market caps. Every row carries a concrete farm
plan with costs and timeframes, derived from that protocol's category, chains,
TVL and age.

## The value model (radar-2)

```
implied = round( 4 x TVL^0.85
               x (1 + clamp(7d, -60, 150) / 100 x 0.6)
               x (0.7 + 0.3 x min(age, 1460) / 1460)
               x (1 + 0.03 x min(chains - 1, 5))
               x category )
```

A power-law log-TVL base (value grows slower than TVL), a growth multiplier
from the seven-day change, an age-without-token bonus (longer with no token,
higher), a chain-breadth bonus, and a category revenue multiple (Derivatives
1.20, Dexs 1.15, curators and allocators 1.10, lending 1.05, most others 1.00
or less). One function scores every row; no protocol name is special-cased.
The board is a model, not a price, and no row predicts whether or when a
token is issued.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
```

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
