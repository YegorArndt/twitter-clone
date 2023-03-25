import { type NextPage } from "next";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { SignInButton, useUser } from "@clerk/nextjs";

import { api, type RouterOutputs } from "~/utils/api";
import { LoadingPage, LoadingSpinner, PageLayout } from "~/components";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { toast } from "react-hot-toast";

dayjs.extend(relativeTime);

const CreatePostWizard = () => {
  const { user } = useUser();

  const [input, setInput] = useState("");

  const ctx = api.useContext();

  const { mutate: createPost, isLoading: isPosting } =
    api.posts.create.useMutation({
      onSuccess: () => {
        setInput("");
        void ctx.posts.getAll.invalidate();
      },
      onError: (error) => {
        const errorMessage = error.data?.zodError?.fieldErrors.content;

        if (errorMessage && errorMessage[0]) {
          toast.error(errorMessage[0]);
          return;
        }

        toast.error("Something went wrong");
      },
    });

  if (!user) return null;

  return (
    <div className="flex w-full items-center gap-3">
      <Image
        src={user.profileImageUrl}
        alt="Profile Image"
        width={56}
        height={56}
        className="rounded-full"
      />
      <input
        placeholder="Type some emojis!"
        className="grow bg-transparent outline-none"
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (input === "" || isPosting) return;
            createPost({ content: input });
          }
        }}
        disabled={isPosting}
      />

      {input !== "" && !isPosting && (
        <button
          className="rounded-md bg-blue-500 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => {
            createPost({ content: input });
          }}
          disabled={isPosting}
        >
          Post
        </button>
      )}
      {isPosting && (
        <div className="w-[2rem]">
          <LoadingSpinner />
        </div>
      )}
    </div>
  );
};

type PostWithUser = RouterOutputs["posts"]["getAll"][number];
const PostView = (props: PostWithUser) => {
  const { post, author } = props;

  return (
    <div className="flex justify-start gap-3 border-b border-slate-400 p-8">
      <Image
        src={author.profileImageUrl}
        alt={`@${author.username}'s profile picture`}
        height={50}
        width={50}
        className="rounded-full"
      />
      <div className="flex flex-col">
        <div className="flex items-center text-slate-300">
          <Link href={`/@${author.username}`}>@{author.username}</Link>
          <Link
            href={`/post/${post.id}`}
            className="font-thin before:mx-1 before:content-['·']"
          >
            {dayjs(post.createdAt).fromNow()}
          </Link>
        </div>
        <span className="text-xl">{post.content}</span>
      </div>
    </div>
  );
};

const Feed = () => {
  const { data, isLoading: postsLoading } = api.posts.getAll.useQuery();

  if (postsLoading) return <LoadingPage />;

  if (!data) return <div>Something went wrong</div>;

  return (
    <div className="flex flex-col">
      {data.map((fullPost) => (
        <PostView key={fullPost.post.id} {...fullPost} />
      ))}
    </div>
  );
};

const Home: NextPage = () => {
  const { isLoaded: userLoaded, isSignedIn } = useUser();

  /**
   * Start fetching asap. With React Query it only needs to fetch
   * data once and then it will be cached
   */
  api.posts.getAll.useQuery();

  if (!userLoaded) return <div />;

  return (
    <PageLayout>
      <div className="flex border-b border-slate-400 p-4 ">
        <div className="flex justify-center">
          {!isSignedIn && <SignInButton />}
        </div>
        {isSignedIn && <CreatePostWizard />}
      </div>
      <Feed />
    </PageLayout>
  );
};

export default Home;
