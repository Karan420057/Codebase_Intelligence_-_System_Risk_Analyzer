import mongoose from 'mongoose'

const repositorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    githubId: {
      type: Number,
      required: true,
    },
    owner: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    private: {
      type: Boolean,
      required: true,
    },
    defaultBranch: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      default: null,
    },
    stars: {
      type: Number,
      default: 0,
    },
    forks: {
      type: Number,
      default: 0,
    },
    watchers: {
      type: Number,
      default: 0,
    },
    openIssues: {
      type: Number,
      default: 0,
    },
    size: {
      type: Number,
      default: 0,
    },
    pushedAt: {
      type: Date,
      default: null,
    },
    topics: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
)

repositorySchema.index({ userId: 1, githubId: 1 }, { unique: true })

export default mongoose.model('Repository', repositorySchema)
