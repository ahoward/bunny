export type FizzbuzzResult = {
  number: number;
  result: string;
};

export type ErrorResponse = {
  error: {
    code: string;
    message: string;
    param?: string;
  };
};
