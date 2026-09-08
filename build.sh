#!/bin/sh
set -e
cd "$(dirname "$0")"

mkdir -p bin
/usr/bin/clang -framework foundation -framework carbon -o bin/select mac/select.m
