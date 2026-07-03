declare module 'flutterwave-node-v3' {
  interface FlutterwaveConfig {
    publicKey: string;
    secretKey: string;
  }

  interface MobileMoneyResponse {
    status: string;
    message: string;
    data?: {
      link?: string;
      redirect_url?: string;
      id?: number;
      tx_ref?: string;
    };
  }

  interface CardChargeResponse {
    status: string;
    message: string;
    data?: {
      link?: string;
      redirect_url?: string;
      id?: number;
      tx_ref?: string;
    };
  }

  interface TransactionVerifyResponse {
    status: string;
    message: string;
    data?: {
      id: number;
      tx_ref: string;
      status: string;
      amount: number;
      currency: string;
      customer?: {
        email: string;
        name: string;
      };
    };
  }

  class Charge {
    card(payload: Record<string, any>): Promise<CardChargeResponse>;
  }

  class MobileMoney {
    mpesa(payload: Record<string, any>): Promise<MobileMoneyResponse>;
  }

  class Transaction {
    verify(params: { id: string }): Promise<TransactionVerifyResponse>;
  }

  class Flutterwave {
    constructor(publicKey: string, secretKey: string);
    Charge: Charge;
    MobileMoney: MobileMoney;
    Transaction: Transaction;
  }

  export default Flutterwave;
}
