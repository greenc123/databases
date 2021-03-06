jest.mock("arangojs");
jest.mock("../../lib/sendFetch");
const { sendFetch } = require("../../lib/sendFetch");
const Arango = require("arangojs");
jest.mock("../../lib/log");
const logGen = require("../../lib/log");
const logger = {
  info: jest.fn(),
  error: jest.fn(),
};
logGen.mockReturnValue(logger);
jest.mock("dotenv");
Arango.Database = jest.fn().mockReturnValue({
  close: jest.fn(),
  createDatabase: jest.fn(),
  exists: jest.fn(),
});

const {
  startArangoDB,
  closeArangoDB,
  createAccount,
  deleteAccount,
  checkIfDatabaseExists,
} = require("./arango");

describe("ArangoDB functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should call Database function", () => {
    startArangoDB();
    expect(Arango.Database).toHaveBeenCalledTimes(1);
  });

  test("should return false", async () => {
    const db = new Arango.Database();
    db.exists = jest.fn().mockReturnValue(false);
    const res = await checkIfDatabaseExists("hi");
    expect(res).toEqual(false);
  });

  test("should return true", async () => {
    const db = new Arango.Database();
    db.exists = jest.fn().mockReturnValue(true);
    const res = await checkIfDatabaseExists("lol");
    expect(res).toEqual(true);
  });

  test("should call db.close function", () => {
    const db = new Arango.Database();
    closeArangoDB();
    expect(db.close).toHaveBeenCalledTimes(1);
  });

  test("should call db.close function and log error", () => {
    const db = new Arango.Database();
    db.close = jest.fn().mockImplementation(() => {
      throw new Error();
    });
    try {
      closeArangoDB();
    } catch (err) {}
    expect(db.close).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  test("should call db.createDatabase function, logger.error when theres an \
  error, and do nothing if argument is invalid", async () => {
    const db = new Arango.Database();
    await createAccount();
    db.close = jest.fn().mockImplementation(() => 1);
    expect(db.createDatabase).toHaveBeenCalledTimes(0);
    expect(logger.error).toHaveBeenCalledTimes(0);

    db.exists = jest.fn().mockReturnValue(true);
    await createAccount({ username: "lol", dbPassword: "hi" });
    expect(db.createDatabase).toHaveBeenCalledTimes(0);

    await createAccount({ username: "", dbPassword: "" });
    expect(db.createDatabase).toHaveBeenCalledTimes(0);

    try {
      db.exists = jest.fn().mockReturnValue(false);
      await createAccount({ username: "hi", dbPassword: "hi" });
      expect(db.createDatabase).toHaveBeenCalledTimes(1);
      db.exists = jest.fn().mockReturnValue(false);
      db.createDatabase = jest.fn().mockImplementation(() => {
        throw new Error();
      });
      await createAccount({ username: "hi", dbPassword: "hi" });
    } catch (err) {}
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  test("should send two fetch requests if successful, logger.error when theres \
  an error, and do nothing if argument is invalid", async () => {
    const db = new Arango.Database();

    await deleteAccount();
    expect(sendFetch).toHaveBeenCalledTimes(0);
    expect(logger.error).toHaveBeenCalledTimes(0);

    db.close = jest.fn().mockImplementation(() => 1);
    db.exists = jest.fn().mockReturnValue(false);
    await deleteAccount("hi");
    expect(sendFetch).toHaveBeenCalledTimes(0);
    sendFetch.mockReturnValue({ jwt: "lol" });
    db.exists = jest.fn().mockReturnValue(true);
    db.dropDatabase = jest.fn().mockReturnValue("lol");
    try {
      await deleteAccount("lol");
    } catch (err) {}
    expect(sendFetch).toHaveBeenCalledTimes(2);
    expect(db.dropDatabase).toHaveBeenCalledTimes(1);

    try {
      sendFetch.mockImplementation(() => {
        throw new Error();
      });
      await deleteAccount("lol");
    } catch (err) {}
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  test("should call Database function and FAIL", () => {
    try {
      Arango.Database.mockImplementation(() => {
        throw new Error();
      });
      startArangoDB();
    } catch (err) {}

    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
