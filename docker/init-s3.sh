#!/bin/bash
set -e

awslocal s3 mb s3://blog-images 2>/dev/null || true
echo "S3 bucket 'blog-images' ready"
