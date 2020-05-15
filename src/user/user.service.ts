import { Injectable } from "@nestjs/common";
import { arrayify, hexlify, randomBytes, verifyMessage } from "ethers/utils";

import { ConfigService } from "../config/config.service";
import { LoggerService } from "../logger/logger.service";
import { User } from "../user/user.entity";
import { UserRepository } from "../user/user.repository";
import { isValidHex } from "../utils";

@Injectable()
export class UserService {
  private nonces: { [key: string]: { address: string; expiry: number } } = {};
  private signerCache: { [key: string]: string } = {};

  constructor(
    private readonly config: ConfigService,
    private readonly log: LoggerService,
    private readonly userRepo: UserRepository,
  ) {
    this.log.setContext("UserService");
  }

  getNonce(address: string): string | undefined {
    if (!isValidHex(address, 20)) {
      this.log.warn(`Invalid Address: ${address}`);
      return "Invalid Address";
    }
    const nonce = hexlify(randomBytes(16));
    const expiry = Date.now() + (2 * 60 * 60 * 1000);
    this.nonces[nonce] = { address, expiry };
    this.log.debug(`getNonce: Gave address ${address} a nonce that expires at ${expiry}: ${nonce}`);
    return nonce;
  }

  async verifySig(givenAddress: string, token: string): Promise<boolean | User> {
    // Get & validate the nonce + signature from provided token
    if (token.indexOf(":") === -1) {
      return this.badToken(`Missing or malformed token: ${token}`);
    }
    const nonce = token.split(":")[0];
    const sig = token.split(":")[1];
    if (!isValidHex(nonce, 16) || !isValidHex(sig, 65)) {
      return this.badToken(`Improperly formatted nonce or sig in token: ${token}`);
    }

    // Get & validate expected address/expiry from local nonce storage
    if (!this.nonces[nonce] || !this.nonces[nonce].address || !this.nonces[nonce].expiry) {
      return this.badToken(`Unknown nonce provided by ${givenAddress}: ${nonce}`);
    }
    const { address, expiry } = this.nonces[nonce];
    if (givenAddress !== address) {
      return this.badToken(`Nonce ${nonce} is for address ${address}, but given address ${givenAddress}`);
    }
    if (Date.now() >= expiry) {
      delete this.nonces[nonce];
      return this.badToken(`Nonce ${nonce} for ${address} expired at ${expiry}`);
    }

    // Cache sig recovery calculation
    if (!this.signerCache[token]) {
      this.signerCache[token] = verifyMessage(arrayify(nonce), sig);
      this.log.debug(`Recovered signer ${this.signerCache[token]} from token ${token}`);
    }
    const signer = this.signerCache[token];
    if (this.signerCache[token] !== address) {
      return this.badToken(`Bad sig for ${nonce}: Got ${this.signerCache[token]}, expected ${address}`);
    }
    return await this.userRepo.getAddressUser(givenAddress);
  }

  private badToken(warning: string): boolean {
    this.log.warn(warning);
    return false;
  }

}
