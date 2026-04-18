import { useState } from "react";
import { useExchange } from "@/hooks/useExchange";

interface ExchangeConnectProps {
  exchange: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ExchangeConnect({
  exchange,
  onSuccess,
  onCancel,
}: ExchangeConnectProps) {
  const { connect, connecting } = useExchange();
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");

  const needsPassphrase = exchange === "okx" || exchange === "kucoin";
  const exchangeNames: Record<string, string> = {
    "crypto.com": "Crypto.com",
    okx: "OKX",
    kucoin: "KuCoin",
  };
  const exchangeName = exchangeNames[exchange] ?? exchange.charAt(0).toUpperCase() + exchange.slice(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!label.trim() || !apiKey.trim() || !apiSecret.trim()) {
      setError("All fields are required");
      return;
    }
    if (needsPassphrase && !passphrase.trim()) {
      setError("Passphrase is required for " + exchangeName);
      return;
    }

    // OKX/KuCoin: encode passphrase into secret as "secret:passphrase"
    const finalSecret = needsPassphrase
      ? `${apiSecret.trim()}:${passphrase.trim()}`
      : apiSecret.trim();

    try {
      await connect({ exchange, label: label.trim(), apiKey: apiKey.trim(), apiSecret: finalSecret });
      onSuccess();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { error: string } } }).response?.data
              ?.error
          : "Failed to connect";
      setError(message || "Failed to connect");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <h3 className="text-lg font-medium">
        Connect {exchangeName}
      </h3>
      <p className="text-sm text-gray-500">
        Use a read-only API key. We never place trades.
      </p>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Account Label</span>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Main Account"
          className="border rounded px-3 py-2 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">API Key</span>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter your API key"
          className="border rounded px-3 py-2 text-sm font-mono"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">API Secret</span>
        <input
          type="password"
          value={apiSecret}
          onChange={(e) => setApiSecret(e.target.value)}
          placeholder="Enter your API secret"
          className="border rounded px-3 py-2 text-sm font-mono"
        />
      </label>

      {needsPassphrase && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Passphrase</span>
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Enter your API passphrase"
            className="border rounded px-3 py-2 text-sm font-mono"
          />
        </label>
      )}

      <div className="flex gap-2 mt-2">
        <button
          type="submit"
          disabled={connecting}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {connecting ? "Connecting..." : "Connect"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border px-4 py-2 rounded text-sm font-medium hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
