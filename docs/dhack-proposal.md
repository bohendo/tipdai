# dHack DAO -- Proposal #1

## Requested Funds

 - 5 ETH
 - 10 dHack DAO tokens as an experiment
 - 50 units of rep
 - 100 GEN

## Background

There's a lot of talk in the crypto space about how to build a good enough UX that new users will flock to the next generation of payments. A lot of effort has been put into educating users about gas prices and making wallet apps with the smoothest user flows possible. I respect the work done so far, but I think there's a better way.

Instead of trying to convince users to download new wallet apps, why don't we bring crypto payments to where people are already spending their time online. If we can give Twitter and Reddit users a simple way to make crypto payments without leaving the platform they know and love, then friction to user adoption can be reduced drastically.

This strategy might sound good, but it hasn't been feasible yet due to the volatility of ETH and high tx fees on Ethereum's main chain. By using MakerDAO's dai payments, we can abstract away the volatility of Ether making it more beginner friendly: newcomers can think & transact using a familiar unit of account (ie USD). Additionally, by using Connext's layer 2 state channel framework, we can eliminate any fees while tipping (however, fees will still need to be paid while depositing or withdrawing).

This means that a crypto-newbie would be able to receive a $1 tip and then pass it along by tipping someone else without needing to know what Ether is, what gas is, what a private key is, or any other crypto-technicals. 

Withdrawing will be slightly more involved as the user will need to have an Ethereum account to withdraw too meaning they'll need to know what a private key is etc. But, in this case, they've already received money via tips and they're trying to cash it out meaning they have a real financial incentive to learn these things.

## Progress Report

During the EthIndia Hackathon, the twitter part of the @TipDai twitter bot was completed allowing it to detect & react to DMs and tweets.

The payment part still needs some work. We're able to deposit Kovan Eth to the bot but after users deposit a total of $10, we encounter bugs rebalancing the state channel collateral. We are able to tag someone in a tweet to increment the recipient's balance but depositing the recipient's balance into a channel runs into the same collateral rebalancing issues. Withdrawals have not been completed yet either and there's still some work to be done making the user's balance available in a non-custodial way via link payments.

## Battle Plan

Upcoming work will include:
 - Refactoring the channel collateral rebalancing so it can handle more than $10 of deposits
 - Adding a smooth withdrawal flow
 - Provide link payments via DMs that would make the bot mostly-non-custodial (eg people can still withdraw their money if the bot's database gets destroyed).

I'm passionate about bringing this bot to life and would be happy to do the above work for free. But, as this bot utilizes state channels to ensure tips are instant w/out any tx fee, I need to provide collateral. I'm requesting 5 ETH (& will trade most of it for DAI) to seed the bot's collateral pool allowing it to handle cumulative user balances of up to about $1000. This should be enough to get the bot off the ground and generate enough user interest to support another round of funding later.
