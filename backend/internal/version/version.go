package version

import (
	_ "embed"
	"runtime/debug"
)

var GoVersion = func() string {
	if info, ok := debug.ReadBuildInfo(); ok {
		return info.GoVersion
	}

	return ""
}()

//go:generate go run gitdescribe/main.go
//go:embed describe.txt
var AppVersion string
