import React, { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { PaginationControl } from "@/components/pagination-control";
import { Connection, PublicKey } from "@solana/web3.js";
import { clusterApiUrl } from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";


// Функція для отримання метаданих токена
const fetchTokenMetadata = async (mintAddress: string) => {
    try {
      const connection = new Connection(clusterApiUrl("devnet"));
      const metaplex = Metaplex.make(connection);
      const mint = new PublicKey(mintAddress);
      const metadata = await metaplex.nfts().findByMint({ mintAddress: mint });

        console.log(metadata);
        return {
          name: metadata.name,
          symbol: metadata.symbol,
          uri: metadata.uri,
        };

    } catch (error) {
      console.error("Error fetching metadata:", error);
      return {
        name: "Unknown",
        symbol: "-",
        uri: "",
      };
    }
  };

interface Token {
    mint: string;
    tokenAmount: {
      uiAmount: number;
      decimals: number;
    };
  }

interface TokenListProps {
  tokens: Token[] | undefined;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const TokenListPage: React.FC<TokenListProps> = ({
  tokens = [],
  currentPage,
  totalPages,
  onPageChange,
}) => {
    const [metadata, setMetadata] = useState<Map<string, { name: string; symbol: string }>>(new Map());

  useEffect(() => {
    const fetchAllMetadata = async () => {
      const entries = await Promise.all(
        tokens.map(async (token) => {
            const { name, symbol } = await fetchTokenMetadata(token.mint);
            return [token.mint, { name, symbol }] as const;
        })
      );
      setMetadata(new Map(entries));
    };
    fetchAllMetadata();
  }, [tokens]);
    
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tokens in Wallet</CardTitle>
        <CardDescription>
          View all token in current wallet.
        </CardDescription>
      </CardHeader>
      <CardContent>
      <ul className="space-y-4">
          {tokens.map((token, index) => (
            <li key={index} className="border p-4 rounded-md shadow-sm">
              <strong>Mint:</strong> {token.mint} <br />
              <strong>Amount:</strong> {token.tokenAmount.uiAmount} <br />
              <strong>Decimals:</strong> {token.tokenAmount.decimals} <br />
              <strong>Name:</strong> {metadata.get(token.mint)?.name || "Unknown"} <br />
              <strong>Symbol:</strong> {metadata.get(token.mint)?.symbol || "-"} <br />
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="flex justify-center">
        <PaginationControl
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </CardFooter>
    </Card>
  );
};


