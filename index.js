require("dotenv").config();
const fastify = require("fastify");
const { PrismaClient } = require("@prisma/client");
var cron = require("node-cron");
const prisma = new PrismaClient();
const Fastify = fastify({
  logger: true,
});

// cron schedule at 12 AM to reset the limit
cron.schedule("0 0 * * *", async () => {
  console.log("CRON STARTED ");
  try {
    let users = await prisma.user.findMany({ select: { id: true } });

    users = users.map((item) => item.id);

    await prisma.user.updateMany({
      data: {
        limit: 20,
      },
      where: {
        id: {
          in: users,
        },
      },
    });
    console.log("CRON RAN SUCCESSFULLY ");
  } catch (error) {
    console.log(error);
  }
});

Fastify.addHook("preHandler", async (request, reply) => {
  try {
    console.log(request.headers.authorization, " COK");
    const user = await prisma.user.findFirstOrThrow({
      where: {
        email: request.headers.authorization.replace("Bearer ", ""),
      },
    });
    request.user = user;
  } catch (error) {
    console.log(error);
    reply.status(error.status ?? 500).send({
      status: false,
      message: error?.message ?? "Something went wrong !",
    });
  }
});

Fastify.get("/retrieve/:shortenlink", async (request, response) => {
  try {
    const { shortenlink } = request.params;
    const { user } = request;
    const data = await prisma.url.findFirstOrThrow({
      select: {
        original_url: true,
      },
      where: {
        short_url: shortenlink,
        user_id: user.id,
        expiry: {
          gte: new Date(),
        },
      },
    });
    response.status(200).send({
      status: true,
      url: data.original_url,
      message: "Url Fetched",
    });
  } catch (error) {
    console.log(error),
      response.status(400).send({
        status: true,
        message: "Url Not Found",
      });
  }
});

Fastify.post("/create", async (request, response) => {
  try {
    const { original_url, expiry } = request.body;
    const url = await prisma.url.findFirst({
      select: {
        short_url: true,
        original_url: true,
        user: true,
      },
      where: {
        original_url,
        user_id: request.user.id,
        expiry: {
          gte: new Date(),
        },
      },
    });

    console.log(request.user.limit, " URL ");
    if (url?.original_url) {
      throw { message: "Url Already Found", status: 400 };
    }

    if (!request.user.limit) {
      throw { message: "Limit Exceeded", status: 400 };
    }

    let short_url = "";
    // let short_url = (Math.random() + 1)
    //   .toString(36)
    //   .substring(request.user.url_length);
    // function generateRandomText(length) {
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    // let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < request.user.url_length; i++) {
      short_url += characters.charAt(
        Math.floor(Math.random() * charactersLength)
      );
    }

    // }

    await prisma.url.create({
      data: {
        expiry,
        short_url,
        original_url,
        user_id: request.user.id,
      },
    });

    await prisma.user.update({
      data: {
        limit: request.user.limit - 1,
      },
      where: {
        id: request.user.id,
      },
    });

    response.status(200).send({
      url: short_url,
      status: true,
    });
  } catch (error) {
    response.status(error.status ?? 500).send({
      status: false,
      message: error?.message ?? "Something went wrong !",
    });
  }
});

const start = () => {
  Fastify.listen({ port: "3000", host: "0.0.0.0" }).then(() => {
    console.log("Server Started !");
  });
};

start();
