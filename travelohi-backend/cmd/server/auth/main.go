package main

import (
	"log"
	"net"

	"google.golang.org/grpc"
)

func main() {
	// tcp listener di port 50051
	listener, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("error, failed to listen : %v", err)
	}

	// bikin gRPC server
	gRPCServer := grpc.NewServer()

	// nanti bikin repository -> usecase/service -> handler
	// trs register ke handler pake grpcserver

	log.Printf("UserService is running on %v", listener.Addr())

	//jalankan gRPC
	if err := gRPCServer.Serve(listener); err != nil {
		log.Fatalf("error, failed to serve : %v", err)
	}
}
