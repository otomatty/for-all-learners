#!/bin/bash
# Setup pre-commit hook to check static export compatibility

cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Pre-commit hook: Check static export compatibility

echo "🔍 Running static export compatibility check..."

bun run check:static-export

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Static export compatibility check failed!"
  echo "   Please fix the issues above before committing."
  echo ""
  echo "   To skip this check (not recommended):"
  echo "   git commit --no-verify"
  exit 1
fi

echo "✅ Static export compatibility check passed!"
EOF

chmod +x .git/hooks/pre-commit

echo "✅ Pre-commit hook installed!"
echo ""
echo "The hook will now check for static export compatibility issues"
echo "before each commit. To skip the check: git commit --no-verify"

