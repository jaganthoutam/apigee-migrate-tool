#!/bin/bash

API_BASE_URL="https://api.enterprise.apigee.com/v1/organizations"
ORG_NAME="<orgName>"
ENV_NAME="<envName>"
AUTH_HEADER="Authorization: Basic <encodedusername:password>"

# List Keystores and Truststores
keystores_response=$(curl -s -X GET "$API_BASE_URL/$ORG_NAME/environments/$ENV_NAME/keystores" \
-H "$AUTH_HEADER")
echo "Keystores and Truststores:"
echo "$keystores_response"

# Iterate through each keystore and perform further actions
keystore_names=$(echo "$keystores_response" | jq -r '.data[].name')
for keystore_name in $keystore_names; do
    echo "Keystore Name: $keystore_name"

    # Get Keystore or Truststore Details
    keystore_details=$(curl -s -X GET "$API_BASE_URL/$ORG_NAME/environments/$ENV_NAME/keystores/$keystore_name" \
    -H "$AUTH_HEADER")
    echo "Keystore Details:"
    echo "$keystore_details"

    # List Aliases in Keystore
    aliases_response=$(curl -s -X GET "$API_BASE_URL/$ORG_NAME/environments/$ENV_NAME/keystores/$keystore_name/aliases" \
    -H "$AUTH_HEADER")
    echo "Aliases in Keystore:"
    echo "$aliases_response"

    # Iterate through each alias and perform further actions
    alias_names=$(echo "$aliases_response" | jq -r '.data[].alias')
    for alias_name in $alias_names; do
        echo "Alias Name: $alias_name"

        # Get Keystore Alias Details
        alias_details=$(curl -s -X GET "$API_BASE_URL/$ORG_NAME/environments/$ENV_NAME/keystores/$keystore_name/aliases/$alias_name" \
        -H "$AUTH_HEADER")
        echo "Alias Details:"
        echo "$alias_details"

        # List Certificates in Alias
        certificates_response=$(echo "$alias_details" | jq -r '.certs[].alias')
        echo "Certificates in Alias:"
        echo "$certificates_response"

        # Iterate through each certificate and perform further actions
        certificate_names=$(echo "$certificates_response")
        for cert_name in $certificate_names; do
            echo "Certificate Name: $cert_name"

            # Export Certificate
            cert_export_response=$(curl -s -X GET "$API_BASE_URL/$ORG_NAME/environments/$ENV_NAME/keystores/$keystore_name/certs/$cert_name/export" \
            -H "$AUTH_HEADER")
            echo "Certificate Export:"
            echo "$cert_export_response"

            # Generate CSR
            csr_response=$(curl -s -X GET "$API_BASE_URL/$ORG_NAME/environments/$ENV_NAME/keystores/$keystore_name/aliases/$alias_name/csr" \
            -H "$AUTH_HEADER")
            echo "CSR Response:"
            echo "$csr_response"
        done
    done
done
