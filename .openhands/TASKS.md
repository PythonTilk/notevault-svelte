# Task List

1. ✅ Inspect chat page and layout to identify rendering issue

2. ✅ Fix layout height/overflow to render Chat and workspace pages correctly

3. ✅ Adjust workspace page containers for correct rendering after creating a workspace

4. ✅ Disable Service Worker during dev and fix invalid cached asset and nav fallback

5. ✅ Resolve duplicate key in chat store to avoid build/runtime quirks

6. ✅ Fix double-sent chat messages
Client no longer emits send-message upon API success, ignores own broadcasts. Server broadcasts from API route to rooms. io exposed to routes.
7. 🔄 Make workspace chat accessible and compact workspace header
Further reductions applied: py-1 on header, smaller avatar and text, tighter buttons. Awaiting visual confirmation.

