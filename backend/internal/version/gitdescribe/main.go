package main

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

func main() {
	os.Exit(run())
}

func run() int {
	output, err := exec.Command("git", "describe", "--tags", "--always", "--dirty").Output()

	version := ""
	if err != nil {
		fmt.Fprintf(os.Stdout, "Error when running git describe: %v\n", err)
	} else {
		version = strings.TrimSpace(string(output))
	}

	f, err := os.Create("describe.txt")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create output file: %v\n", err)
		return 1
	}
	defer f.Close()

	if _, err := fmt.Fprint(f, version); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to write to output file: %v\n", err)
		return 1
	}

	return 0
}
