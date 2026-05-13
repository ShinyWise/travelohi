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

	// Depedency injection
	// nanti bikin repository -> usecase/service -> handler
	// trs register ke handler pake grpcserver
	// userRepo := repository.NewPostgresUserRepository(dbConn)
	// userUseCase := usecase.NewUserUseCase(userRepo)
	// userHandler := handler.NewUserHandler(userUserCase)

	// userpb.RegisterUserServiceServer(gRPCServer, userHandler)
	log.Printf("UserService is running on %v", listener.Addr())

	//jalananiun gRPC
	if err := gRPCServer.Serve(listener); err != nil {
		log.Fatalf("error, failed to serve : %v", err)
	}
}
