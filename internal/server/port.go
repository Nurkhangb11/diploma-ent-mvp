package server

import (
	"fmt"
	"log"
	"net"
	"os"
	"strconv"
)

const (
	defaultPort    = 8080
	maxPortRetries = 10
	portFileName   = ".backend-port"
)

// ResolveAddr picks a listen address. Uses PORT env if set, otherwise tries 8080..8089.
func ResolveAddr() string {
	if p := os.Getenv("PORT"); p != "" {
		return ":" + p
	}

	for port := defaultPort; port < defaultPort+maxPortRetries; port++ {
		if portAvailable(port) {
			if port != defaultPort {
				log.Printf("Port %d is busy, using %d", defaultPort, port)
			}
			writePortFile(port)
			return fmt.Sprintf(":%d", port)
		}
	}

	log.Fatalf("No free port in range %d–%d. Close other apps or set PORT=8090", defaultPort, defaultPort+maxPortRetries-1)
	return ""
}

func portAvailable(port int) bool {
	ln, err := net.Listen("tcp", fmt.Sprintf(":%d", port))
	if err != nil {
		return false
	}
	_ = ln.Close()
	return true
}

func writePortFile(port int) {
	_ = os.WriteFile(portFileName, []byte(strconv.Itoa(port)), 0644)
}
