/** @format */

import validations from "../../web3/utils/validations";
import { TickMath } from "@uniswap/v3-sdk";
import { queryGql } from "../utils/gql";

export const getPositionValue = async (parameters: any, config: any) => {
  try {
    let { KAIA_KAIASCAN_API_KEY, network } = config;
    let { positionId } = parameters;
    network = network ? network.toLowerCase() : "kairos";

    validations.checkApiKey(KAIA_KAIASCAN_API_KEY);
    validations.checkNetwork(network);

    const positionQuery = `
      query PositionDetails($positionId: String!) {
        positions(where: {id: $positionId}) {
          id
          liquidity
          tickLower
          tickUpper
          pool {
            token0 {
              symbol
              decimals
              derivedETH
            }
            token1 {
              symbol
              decimals
              derivedETH
            }
            tick
          }
        }
        bundle(id: "1") {
          ethPriceUSD
        }
      }
    `;

    const data = await queryGql(positionQuery, { positionId });

    if (data.errors || !data.data.positions.length) {
      throw new Error("Position not found");
    }

    const position = data.data.positions[0];
    const ethPriceUSD = parseFloat(data.data.bundle.ethPriceUSD);

    const liquidity = BigInt(position.liquidity);
    const currentTick = parseInt(position.pool.tick);

    const sqrtRatioCurrent = BigInt(
      TickMath.getSqrtRatioAtTick(currentTick).toString()
    );
    const sqrtRatioLower = BigInt(
      TickMath.getSqrtRatioAtTick(parseInt(position.tickLower)).toString()
    );
    const sqrtRatioUpper = BigInt(
      TickMath.getSqrtRatioAtTick(parseInt(position.tickUpper)).toString()
    );

    let amount0 = BigInt(0);
    let amount1 = BigInt(0);

    if (sqrtRatioCurrent <= sqrtRatioLower) {
      amount0 =
        (liquidity * (sqrtRatioUpper - sqrtRatioLower)) /
        (sqrtRatioUpper * sqrtRatioLower);
    } else if (sqrtRatioCurrent < sqrtRatioUpper) {
      amount0 =
        (liquidity * (sqrtRatioUpper - sqrtRatioCurrent)) /
        (sqrtRatioUpper * sqrtRatioCurrent);
      amount1 = liquidity * (sqrtRatioCurrent - sqrtRatioLower);
    } else {
      amount1 = liquidity * (sqrtRatioUpper - sqrtRatioLower);
    }

    const token0Decimals = parseInt(position.pool.token0.decimals);
    const token1Decimals = parseInt(position.pool.token1.decimals);

    const amount0Formatted =
      parseFloat(amount0.toString()) / Math.pow(10, token0Decimals);
    const amount1Formatted =
      parseFloat(amount1.toString()) / Math.pow(10, token1Decimals);

    const token0PriceUSD =
      parseFloat(position.pool.token0.derivedETH) * ethPriceUSD;
    const token1PriceUSD =
      parseFloat(position.pool.token1.derivedETH) * ethPriceUSD;

    const token0ValueUSD = amount0Formatted * token0PriceUSD;
    const token1ValueUSD = amount1Formatted * token1PriceUSD;
    const totalValueUSD = token0ValueUSD + token1ValueUSD;

    return {
      positionId,
      token0: {
        symbol: position.pool.token0.symbol,
        amount: amount0Formatted,
        valueUSD: token0ValueUSD,
      },
      token1: {
        symbol: position.pool.token1.symbol,
        amount: amount1Formatted,
        valueUSD: token1ValueUSD,
      },
      totalValueUSD,
      isInRange:
        currentTick >= parseInt(position.tickLower) &&
        currentTick <= parseInt(position.tickUpper),
    };
  } catch (error: any) {
    throw new Error(`Failed to calculate position value: ${error.message}`);
  }
};
