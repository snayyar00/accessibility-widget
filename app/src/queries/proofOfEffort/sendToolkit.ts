import { gql } from '@apollo/client'

export const SEND_PROOF_OF_EFFORT_TOOLKIT = gql`
  mutation SendProofOfEffortToolkit($input: SendToolkitInput!) {
    sendProofOfEffortToolkit(input: $input) {
      success
      message
    }
  }
` 