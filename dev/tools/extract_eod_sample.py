# /// script
# requires-python = ">=3.10"
# dependencies = ["pandas", "pyarrow"]
# ///
"""Extract per-symbol daily bars for the chart-core dev harness.

Reads the trading app's EOD master parquet directly (no server, no auth — the
backend itself just `pd.read_parquet`s this file and slices per symbol) and
writes one `Candle[]` JSON file per symbol into `dev/public/eod/<SYMBOL>.json`.

PROVENANCE, NOT A BUILD STEP. The input is a ~274 MB parquet that lives in a
sibling repo checkout on the author's machine:

    ../trading_app/volumes/data/EOD/eod_master_data.parquet
    (backend path key: EOD_MASTER_DATA_PARQUET, config/paths.py)

That file is not part of this repo and is not fetched here, so this extractor is
reproducible only where that checkout exists. The output it produces IS committed
(dev/public/eod/*.json) and is what the harness actually reads — rerun this only
to refresh or extend the committed sample.

Run from this repo's root with its own ephemeral uv env (chart-core's .venv has
pandas but no pyarrow), which the PEP 723 header above declares:

    uv run dev/tools/extract_eod_sample.py
"""

import json
from pathlib import Path

import pandas as pd

# Ten liquid NSE names, confirmed present in the master parquet.
SYMBOLS = [
    "RELIANCE",
    "TCS",
    "INFY",
    "HDFCBANK",
    "ICICIBANK",
    "SBIN",
    "ITC",
    "HINDUNILVR",
    "BHARTIARTL",
    "KOTAKBANK",
]

# ~10y of trading days. 5Y is the widest zoom mark, so this leaves an equal
# amount of pan scrollback to the left of the widest view.
TAIL_ROWS = 2520

REPO_ROOT = Path(__file__).resolve().parents[2]
PARQUET = (
    REPO_ROOT.parent
    / "trading_app"
    / "volumes"
    / "data"
    / "EOD"
    / "eod_master_data.parquet"
)
OUT_DIR = REPO_ROOT / "dev" / "public" / "eod"

# Columns kept per bar. `ema*` are intentionally dropped — chart-core recomputes
# EMAs in-browser; the `high*` columns stay (the rolling-highs indicator reads
# them off each bar). This maps exactly onto the `Candle` type (src/types.ts).
PRICE_COLS = ["open", "high", "low", "close"]
HIGH_COLS = ["high1y", "high2y", "high3y", "highAll"]
KEEP_COLS = ["date", *PRICE_COLS, "volume", *HIGH_COLS]


def extract_symbol(df: pd.DataFrame, symbol: str) -> list[dict]:
    """Slice one symbol's last TAIL_ROWS bars into rounded Candle dicts."""
    sub = df[df["symbol"] == symbol].sort_values("date").tail(TAIL_ROWS)
    if sub.empty:
        raise SystemExit(f"no rows for {symbol!r} in {PARQUET}")

    bars: list[dict] = []
    for row in sub.itertuples(index=False):
        bar: dict = {"date": pd.Timestamp(row.date).strftime("%Y-%m-%d")}
        # Round on write: raw float64 serialises as 1234.5599999999999 and
        # inflates the files ~35% for digits no chart can show.
        for col in PRICE_COLS:
            bar[col] = round(float(getattr(row, col)), 2)
        bar["volume"] = int(getattr(row, "volume"))
        for col in HIGH_COLS:
            val = getattr(row, col)
            if pd.notna(val):
                bar[col] = round(float(val), 2)
        bars.append(bar)
    return bars


def main() -> None:
    if not PARQUET.exists():
        raise SystemExit(
            f"master parquet not found at {PARQUET}\n"
            "This extractor needs the trading_app checkout beside this repo."
        )
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    df = pd.read_parquet(PARQUET, columns=[*KEEP_COLS, "symbol"])
    for symbol in SYMBOLS:
        bars = extract_symbol(df, symbol)
        out = OUT_DIR / f"{symbol}.json"
        out.write_text(json.dumps(bars, separators=(",", ":")))
        print(f"{symbol}: {len(bars)} bars -> {out.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
