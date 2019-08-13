#!/usr/bin/env bash
set -e

function hr {
  for i in {1..58}
  do echo -n "-"
  done
  echo
}

format='{printf("| %-32s|%8s  ->  %-8s|\n", $1, $3, $4)}'
echo;echo "  Checking depencencies"
hr
npm outdated -S | tail -n +2 | awk '$3 != $4' | awk "$format"
hr
echo;echo "  Checking devDepencencies"
hr
npm outdated -D | tail -n +2 | awk '$3 != $4' | awk "$format"
hr
echo;echo "Done!"
