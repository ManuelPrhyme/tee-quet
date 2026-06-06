# Project Summary
**Tee_Quet** is a decentralized ticketing solution that utilizes **Sui Move contracts** to manage event creation, ticket ownership, and secure payments.  
By leveraging **Walrus**, the platform ensures that ticket metadata and images are stored as verifiable, tamper-proof blobs, making it impossible for tickets to be faked or manipulated.  
The platform automates the transfer of ownership from creators to users upon purchase, providing a transparent and verifiable record on-chain.

---

# Technical Workflow

## 1. Event Creation and Asset Hosting
- **Event Definition**: An event creator defines the event name, total number of tickets, and ticket price in USDC.  
- **Blob Uploading (Walrus)**: The creator uploads the main event image and ticket image. These assets are deployed as blobs on Walrus, ensuring decentralized storage.  
- **On-chain State Initialization**: The creator pays a fee 5 USDC to the package creator. The Sui Move contract then creates the event state on the Sui network, linking it to the Walrus blobs.

## 2. Ticket Minting
- **Individual Objects**: Once the event is live, the contract mints the specified number of tickets.  
- **Walrus Association**: Each ticket exists on-chain as a Sui object associated with a specific blob on Walrus, ensuring verifiable ticket data and visuals.

## 3. Purchasing and Claiming
- **User Transaction**: A buyer selects an event and claims a ticket by paying the designated price in USDC.  
- **Atomic Transfer**: Upon payment, the Sui Move contract triggers a public transfer of the ticket object from the event creator to the buyer’s wallet.  
- **Payment Settlement**: The contract automatically moves funds from the buyer to the event owner.

## 4. Verification
- **On-chain Verifiability**: Ticket ownership can be instantly verified by checking the object’s owner address against the user’s wallet.  
- **Anti-Tamper Mechanism**: Walrus integration ensures ticket information is verifiable and tamper-proof, enforced by the deployed Sui package and its internal modules.

---

# Technical Components
- **Blockchain**: Sui Network (object ownership and state management)  
- **Smart Contract Language**: Sui Move (access control and payment logic)  
- **Storage Layer**: Walrus (decentralized storage of event/ticket blobs)  
- **Currency Support**: Sui, WAL, and USDC  
