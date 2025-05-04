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
import { TokenInfo } from "@solana/spl-token-registry";
import { Metadata, MetadataData } from "@metaplex-foundation/mpl-token-metadata"; // Оновлений імпорт

const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Функція для отримання PDA для метаданих токена
const getMetadataPDA = async (mint: PublicKey) => {
  const [metadataPDA] = await PublicKey.findProgramAddress(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  );
  return metadataPDA;
};

// Функція для отримання метаданих токена
const fetchTokenMetadata = async (mint: string) => {
    const tokenMint = new PublicKey(mint);
  
    try {
      const metadataPDA = await getMetadataPDA(tokenMint);
      const metadataAccount = await connection.getAccountInfo(metadataPDA);
  
      if (!metadataAccount || !metadataAccount.data) {
        throw new Error("No metadata found for this token");
      }
  
      // Завантажуємо метадані з використанням бібліотеки @metaplex-foundation/mpl-token-metadata
      const metadata = await Metadata.load(connection, metadataPDA);
  
      return {
        name: metadata.data.data.name,
        symbol: metadata.data.data.symbol,
        uri: metadata.data.data.uri,
      };
    } catch (err) {
      console.error("Error fetching metadata:", err);
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
          const metadataMap = new Map();
          for (const token of tokens) {
            const { name, symbol } = await fetchTokenMetadata(token.mint);
            metadataMap.set(token.mint, { name, symbol });
          }
          setMetadata(metadataMap);
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
          {tokens.map((token, index) => {
            return (
              <li key={index} className="border p-4 rounded-md shadow-sm">
                <strong>Mint:</strong> {token.mint} <br />
                <strong>Amount:</strong> {token.tokenAmount.uiAmount} <br />
                <strong>Decimals:</strong> {token.tokenAmount.decimals} <br />
                <strong>Name:</strong> {metadata.get(token.mint)?.name || "Unknown"} <br />
                <strong>Symbol:</strong> {metadata.get(token.mint)?.symbol || "-"} <br />
              </li>
            );
          })}
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
