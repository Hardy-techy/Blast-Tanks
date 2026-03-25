import React from 'react';
import { ConnectButton } from "thirdweb/react";
import { client, somniaTestnet } from "./src/lib/thirdweb";

export function Test() {
    return <ConnectButton 
        client={client} 
        chain={somniaTestnet} 
        detailsButton={{
            displayBalanceToken: {
                [somniaTestnet.id]: "0x7f41952740040bA3030a34a7548c45Aac4663496"
            }
        }}
    />;
}
