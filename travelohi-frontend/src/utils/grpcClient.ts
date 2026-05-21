import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport";
import type { RpcInterceptor, NextUnaryFn, UnaryCall, MethodInfo, RpcOptions } from "@protobuf-ts/runtime-rpc";

const ENVOY_URL = import.meta.env.VITE_ENVOY_URL || "http://localhost:8080";

const authInterceptor: RpcInterceptor = {
    interceptUnary(next: NextUnaryFn, method: MethodInfo, input: object, options: RpcOptions): UnaryCall {
        const token = localStorage.getItem("access_token");

        if (token) {
            if (!options.meta) {
                options.meta = {};
            }
            options.meta["authorization"] = `Bearer ${token}`;
        }

        return next(method, input, options);
    }
};

export const transport = new GrpcWebFetchTransport({
    baseUrl: ENVOY_URL,
    interceptors: [authInterceptor],
});