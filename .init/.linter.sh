#!/bin/bash
cd /home/kavia/workspace/code-generation/interactive-chess-platform-214918-214927/chess_game_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

