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

        const call = next(method, input, options);

        call.status.then(status => {
            if (status.code === 'UNAUTHENTICATED') {
                handleSessionExpired();
            }
        }).catch(err => {
            if (err.code === 'UNAUTHENTICATED' || err.message?.toLowerCase().includes('unauthenticated')) {
                handleSessionExpired();
            }
        });

        return call;
    }
};

const handleSessionExpired = () => {
    if (!window.location.href.includes('expired=true')) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_id');
        localStorage.removeItem('profile_picture_url');
        window.location.href = '/?expired=true';
    }
};

export const transport = new GrpcWebFetchTransport({
    baseUrl: ENVOY_URL,
    interceptors: [authInterceptor],
});