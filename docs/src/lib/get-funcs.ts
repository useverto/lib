import matter from "gray-matter";
import fs from "fs";
import path from "path";

export default () => {
  const funcs = fs
    .readdirSync("./funcs/")
    .filter((file) => path.extname(file) === ".md")
    .map((file) => {
      const fileContent = fs.readFileSync(`./funcs/${file}`, "utf8");
      const { data, content } = matter(fileContent);

      return { ...data, slug: file.split(".")[0], body: content };
    });

  return funcs;
};
