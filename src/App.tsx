import React from "react";

import { useEffect, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import "@solana/wallet-adapter-react-ui/styles.css";

import { toast } from "sonner";
import { useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "graphql-request";
import { config } from "@/solana-service/config";
import { Connection, PublicKey } from "@solana/web3.js";
import { clusterApiUrl } from "@solana/web3.js";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

import { EscrowProgram } from "@/solana-service/program";
import { Wallet } from "@coral-xyz/anchor";
import { OffersPage } from "@/pages/all-offers";
import { OpenOffersPage } from "@/pages/open-offers";
import AccountOffers from "@/pages/account-offers";
import { Offer } from "@/types/offer";

import { Toaster } from "sonner";
import { createPass, query } from "./utils";

import TakeOfferDialog from "@/components/dialogs/take-offer-dialog";
import { TokenListPage } from "./pages/token-list";
import { TokenListProvider, TokenInfo } from "@solana/spl-token-registry";

// Token interface
interface Token {
  mint: string;
  tokenAmount: {
    uiAmount: number;
    decimals: number;
  };
}

const App: React.FC = () => {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const wallet = useAnchorWallet();
  const queryClient = useQueryClient();
  const [tokenMap, setTokenMap] = useState<Map<string, TokenInfo>>(new Map());

  const { data } = useQuery({
    queryKey: ["offers"],
    async queryFn() {
      return await request<{ offers: Offer[] | undefined }>(
        config.subgraphUrl,
        query
      );
    },
  });

  const [currentPage, setCurrentPage] = useState({
    orders: 1,
    openOffers: 1,
    accountOffers: 1,
    tokenList: 1
  });

  const { connect, connected, publicKey, disconnect, select, wallets } =
    useWallet();

  const ITEMS_PER_PAGE = 5;

  const paginatedOffers = data?.offers?.slice(
    (currentPage.orders - 1) * ITEMS_PER_PAGE,
    currentPage.orders * ITEMS_PER_PAGE
  );


  const paginatedOpenOffers = (data?.offers ?? [])
    .filter((el) => !el.closed)
    ?.slice(
      (currentPage.openOffers - 1) * ITEMS_PER_PAGE,
      currentPage.openOffers * ITEMS_PER_PAGE
    );

  const totalPages = {
    orders: Math.ceil((data?.offers?.length ?? 1) / ITEMS_PER_PAGE),
    openOffers: Math.ceil((data?.offers?.length ?? 1) / ITEMS_PER_PAGE),
  };

  const connectWallet = async () => {
    setLoading(true);
    try {
      select(wallets[0].adapter.name);
      await connect();
      return;
    } catch (e) {
      toast.error("Error connecting to wallet");
    }
  };

  const onTakeOffer = async () => {
    setLoading(true);
    if (!isWalletConnected) {
      select(wallets[0].adapter.name);
      await connect();
      return;
    }
    try {
      const connection = new Connection(
        clusterApiUrl(WalletAdapterNetwork.Devnet)
      );
      if (!wallet || !selectedOffer) return;

      const contract = new EscrowProgram(connection, wallet as Wallet);
      await contract.takeOffer(
        new PublicKey(selectedOffer?.acctMaker),
        new PublicKey(selectedOffer?.acctOffer),
        new PublicKey(selectedOffer?.acctTokenMintA),
        new PublicKey(selectedOffer?.acctTokenMintB)
      );
    } catch (e) {
      toast.error("Error taking offer");
    } finally {
      await queryClient.invalidateQueries({ queryKey: ["offers"] });
      setLoading(false);
    }
  };

  const handlePageChange = (tab: string, page: number) => {
    setCurrentPage((prev) => ({
      ...prev,
      [tab]: page,
    }));
  };

  useEffect(() => {
    if (connected && publicKey) {
      setIsWalletConnected(true);
      setWalletAddress(publicKey.toString());
    }
  }, [connected, publicKey]);

  useEffect(() => {
    const getTokens = async () => {
      if (!walletAddress) return;

      const connection = new Connection("https://api.devnet.solana.com", "confirmed");
      const publicKey = new PublicKey(walletAddress);

      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );

      const filtered = tokenAccounts.value
        .map((acc) => acc.account.data.parsed.info)
        .filter((info) => info.tokenAmount.uiAmount > 0);

      setTokens(filtered);
    };

    getTokens();
  }, [walletAddress]);

  useEffect(() => {
    new TokenListProvider().resolve().then((tokens) => {
      const tokenList = tokens.filterByChainId(103).getList(); // 103 — devnet, 101 — mainnet
      const map = new Map(tokenList.map((t) => [t.address, t]));
      setTokenMap(map);
    });
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-3xl font-bold text-center mb-8">
          Solana Offers Management
        </h1>
        <h2 className="text-lg font-bold text-center mb-8">
          Password: {createPass(walletAddress)}
        </h2>
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="orders">All Offers</TabsTrigger>
            <TabsTrigger value="openOffers">Open Offers</TabsTrigger>
            <TabsTrigger value="accountOffers">Account Offers</TabsTrigger>
            <TabsTrigger value="tokenList">Tokens List</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <OffersPage
              isWalletConnected={isWalletConnected}
              paginatedOffers={paginatedOffers}
              currentPage={currentPage.orders}
              totalPages={totalPages.orders}
              onPageChange={(page) => handlePageChange("orders", page)}
            />
          </TabsContent>

          <TabsContent value="openOffers">
            <OpenOffersPage
              paginatedOpenOffers={paginatedOpenOffers}
              currentPage={currentPage.openOffers}
              totalPages={totalPages.openOffers}
              onPageChange={(page) => handlePageChange("openOffers", page)}
              onTakeOffer={(offer: Offer) => setSelectedOffer(offer)}
            />
          </TabsContent>

          <TabsContent value="accountOffers">
            <AccountOffers
              isWalletConnected={isWalletConnected}
              disconnect={disconnect}
              setIsWalletConnected={setIsWalletConnected}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="tokenList">
            <TokenListPage
              tokens={tokens}
              currentPage={currentPage.tokenList}
              totalPages={totalPages.orders}
              onPageChange={(page) => handlePageChange("tokenList", page)}
            />
          </TabsContent>

          <TakeOfferDialog
            selectedOffer={selectedOffer}
            setSelectedOffer={setSelectedOffer}
            isWalletConnected={isWalletConnected}
            connectWallet={connectWallet}
            onTakeOffer={onTakeOffer}
            loading={loading}
          />
        </Tabs>
      </div>
      <Toaster />
    </main>
  );
};

export default App;
