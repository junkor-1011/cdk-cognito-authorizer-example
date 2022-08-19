#!/usr/bin/env bash
set -eu

# TMP
PROJECT_PARAM_PREFIX="TESTAPPX"

SCRIPT_DIR="$(cd "$(dirname "$0")" || exit; pwd)"
cd "${SCRIPT_DIR}" || exit

if [ -f ./params ]; then
    source ./params
else
    echo "There is no params file. exit."
    exit 1
fi

aws --profile "${AWS_PROFILE:-default}" ssm put-parameter \
  --name "/${PROJECT_PARAM_PREFIX}/${STAGE}/COGNITO_POOL_CLIENT_DOMAIN_NAME" \
  --type "String" \
  --value "${COGNITO_POOL_CLIENT_DOMAIN_NAME}" \
  --overwrite
