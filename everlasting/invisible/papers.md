# Papers

Gradient norm is inversely correlated with data length (Liu et al.,2025b; Xia et al., 2024a)

local loss landscape as exhibiting high quadraticity, at least along most directions[^1][^2][^3]，这个结论可以帮助一些放缩，比如忽略三次项、固定二阶导

Several works (Needell et al.,2014; Zhao & Zhang, 2015; Alain et al., 2015) have shown the optimal distribution to be proportional to the per-sample gradient norm. 
这里的optimal distribution是让梯度方差最小的分布。

deep neural networks memorize specific training examples and that parameters in later layers are highly specialized to specific features[^5][^6]

## unlearning

从meta unlearning[^4]得到启发，可以在训练一个东西的时候就预测后续事情的性能，加meta learning项.比如在pretrain的时候就预测SFT,RL的性能，在unlearn的时候就考虑relearn的表现

llama3中有一些被深度记忆的人，论文识别了他们并对此设计出问题[^7]

对于 unlearning 的真正目标的质疑，不一定是黄金标准：unlearning/representation/ME&AP 中给出：TOFU的重训模型在未见过的回答上其实也不会忠实地就输出不知道，而是自己也会得到幻觉，从泄露真实事实变成编造相关事实





[^1]: Huanran Chen, Yinpeng Dong, Zeming Wei, Yao Huang, Yichi Zhang, Hang Su, and Jun Zhu. Understanding pre-training and fine-tuning from loss landscape perspectives. arXiv preprint arXiv:2505.17646, 2025.
[^2]: Hao Li, Zheng Xu, Gavin Taylor, Christoph Studer, and Tom Goldstein. Visualizing the loss landscape of neural nets. Advances in Neural Information Processing Systems, 31, 2018.
[^3]: Kaiyue Wen, Tengyu Ma, and Zhiyuan Li. How does sharpness-aware minimization minimize sharpness? arXiv preprint arXiv:2211.05729, 2022.
[^4]: https://arxiv.org/abs/2410.12777
[^5]: Feldman, V. 2020. Does learning require memorization? a short tale about a long tail. In Proceedings of the 52nd Annual ACM SIGACT Symposium on Theory of Computing, 954-959
[^6]: Stephenson, C.; Padhy, S.; Ganesh, A.; Hui, Y.; Tang, H.; and Chung, S. 2021. On the geometry of generalization and memorization in deep neural networks. arXiv preprint arXiv:2105.14602.
[^7]: https://arxiv.org/pdf/2407.10058