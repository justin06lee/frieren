VERSION     := $(shell git describe --tags --match 'v*' --always --dirty 2>/dev/null || echo dev)
INSTALL_DIR := $(HOME)/.local/bin

.PHONY: all build install update test clean

all: build install

build:
	go build -ldflags "-X main.version=$(VERSION)" -o dist/frieren .

install: build
	mkdir -p $(INSTALL_DIR)
	install dist/frieren $(INSTALL_DIR)/frieren
	@case ":$$PATH:" in \
	  *:"$(INSTALL_DIR)":*) echo "installed $(INSTALL_DIR)/frieren" ;; \
	  *) echo "installed $(INSTALL_DIR)/frieren — NOTE: $(INSTALL_DIR) is not in your PATH" ;; \
	esac

update: all

test:
	go test ./...

clean:
	rm -rf dist
