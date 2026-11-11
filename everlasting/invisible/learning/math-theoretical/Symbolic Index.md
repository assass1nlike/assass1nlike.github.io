# Symbolic Index：潜在思维链的能力与基本极限

本文研究显式思维链（CoT）与潜在思维链（Latent CoT）之间的探索-执行权衡。输入记为随机变量 \(X\)，具体样本为 \(x\)；与答案 \(y\) 对应的思维链为 \(S=(s_1,\ldots,s_M)\)。显式 CoT 逐个生成离散 token，而 Latent CoT 通过 Coconut 课程把思维链前缀压缩为连续隐状态 \(h_k\in\mathbb R^d\)。

文中把推理看成决策图 \(Q=(G,v_{\rm start},V_{\rm target})\) 上的行走。节点 \(v\) 的合法下一步集合是 \(N_{\rm valid}(v)\)，理想探索分布为
\[
q_{\rm PR}(u\mid v)=\frac{1}{|N_{\rm valid}(v)|}\mathbf 1[u\in N_{\rm valid}(v)].
\]
模型分布与该理想分布的 KL 散度越小，表示越愿意保留多个候选推理路径。

## 定理 4.1（Coconut 与条件信息瓶颈的对偶性）

在模型容量有限的约束下，Coconut 在第 \(k\) 阶段的训练可以写成
\[
\begin{aligned}
\min_{p(h_k\mid X)}\quad &H\!\left(S^{(k+1:M)}\mid h_k,X\right),\\
\text{s.t.}\quad &I\!\left(h_k;S^{(1:k)}\mid X\right)\le R .
\end{aligned}
\]
其拉格朗日对偶为条件信息瓶颈（CIB）目标
\[
\min_{p(h_k\mid X)}
 I\!\left(h_k;S^{(1:k)}\mid X\right)
 -\beta(k)\,I\!\left(h_k;S^{(k+1:M)}\mid X\right),
\]
其中 \(\beta(k)>0\)，并且在本文的效率前沿模型中满足
\(\beta(k)\asymp k/(M-k)\)。因此，随着课程由 \(k=0\) 推进到 \(k=M\)，模型逐渐压缩更长的过去前缀，同时只需预测更短的未来后缀。

这里 \(I(h_k;S^{(1:k)}\mid X)\) 是隐状态保留的过去信息量，\(I(h_k;S^{(k+1:M)}\mid X)\) 是它对未来思维链的预测信息量。这个定理的直觉是：Coconut 并非随意地把 token 换成向量，而是在有限容量下寻找一个“最小但足够”的中间表示。

### 引理 A.1（损失与互信息）

假设解码器族 \(\{p_\theta(S^{(k+1:M)}\mid h_k,X)\}\) 是良设定的：存在 \(\theta^\star\)，使得几乎处处有
\[
p_{\theta^\star}(S^{(k+1:M)}\mid h_k,X)=p(S^{(k+1:M)}\mid h_k,X),
\]
并假设 \(H(S^{(k+1:M)}\mid X)<\infty\)。则
\[
\min_\theta L_{\rm Coconut}^{(k)}(\theta)
\Longleftrightarrow
\max_{p(h_k\mid X)}I(h_k;S^{(k+1:M)}\mid X).
\]

**证明。** Coconut 损失为
\[
L_{\rm Coconut}^{(k)}(\theta)=\mathbb E[-\log p_\theta(S^{(k+1:M)}\mid h_k,X)].
\]
在真实条件分布中加上并减去 \(\log p(S^{(k+1:M)}\mid h_k,X)\)，得到交叉熵分解
\[
L_{\rm Coconut}^{(k)}(\theta)
=H(S^{(k+1:M)}\mid h_k,X)
+D_{\rm KL}\!\left(p(\cdot\mid h_k,X)\,\|\,p_\theta(\cdot\mid h_k,X)\right).
\]
良设定意味着可以取 \(\theta=\theta^\star\) 使 KL 项为零，所以最小化损失等价于最小化条件熵。再用
\[
H(S^{(k+1:M)}\mid h_k,X)
=H(S^{(k+1:M)}\mid X)-I(h_k;S^{(k+1:M)}\mid X),
\]
其中第一项与编码器无关，于是得到结论。这个步骤说明：训练隐状态的唯一目标是保留对未来推理有用的信息。

**定理 4.1 的证明。** 引理 A.1 把 Coconut 损失化为
\(\min H(S^{(k+1:M)}\mid h_k,X)\)。有限模型容量要求隐状态不能无损携带整个过去，形式化为
\(I(h_k;S^{(1:k)}\mid X)\le R\)。引入乘子 \(\lambda\ge0\)，拉格朗日函数为
\[
\mathcal J
=H(S^{(k+1:M)}\mid h_k,X)
+\lambda\!\left[I(h_k;S^{(1:k)}\mid X)-R\right].
\]
将条件熵改写成互信息后，去掉与 \(p(h_k\mid X)\) 无关的常数，得到
\[
\min_{p(h_k\mid X)}
\left\{
\lambda I(h_k;S^{(1:k)}\mid X)-I(h_k;S^{(k+1:M)}\mid X)
\right\}.
\]
令 \(\beta=1/\lambda\)，再除以 \(\lambda\)，即得 CIB 目标。

为解释 \(\beta(k)\) 的尺度，令 \(I_{\rm past}=I(h_k;S^{(1:k)}\mid X)\)，\(I_{\rm future}=I(h_k;S^{(k+1:M)}\mid X)\)，并采用论文给出的效率前沿模型
\[
I_{\rm future}(I_{\rm past};k)=I_{\max}(k)\left(1-e^{-\alpha(k)I_{\rm past}}\right),
\]
其中 \(I_{\max}(k)\propto M-k\)，而 \(\alpha(k)\propto 1/(C_1k+C_0)\)。前沿上的最优点满足
\(\mathrm dI_{\rm future}/\mathrm dI_{\rm past}=1/\beta(k)\)。代入并在 \(I_{\rm past}\) 接近瓶颈上限时展开指数，可得
\[
\beta(k)=e^{C_1/C_2}\left(1+\frac{C_0+C_1k}{C_2(M-k)}+O((M-k)^{-1})\right),
\]
其主导尺度为 \(\beta(k)\asymp k/(M-k)\)。

## 假设 4.2（CoT 的 \(\kappa\)-集中分布）

在有 \(B\) 个候选 token 的决策点，把单条成功 CoT 的下一步分布 \(p_{\rm CoT}\) 建模为 Dirichlet 先验抽样：
\[
p_{\rm CoT}\sim {\rm Dirichlet}(\alpha_1,\ldots,\alpha_B),\qquad
\kappa=\sum_{i=1}^B\alpha_i.
\]
大 \(\kappa\) 表示分布高度集中，符合显式 CoT 为了逐步精确执行而形成高决策确定性的现象。

### 引理 A.2（CoT 输出熵的上界）

若某个选项 \(j\) 占据几乎全部 Dirichlet 质量，即
\(\alpha_j=\kappa-(B-1)c\)，其余 \(\alpha_i=c\;(i\ne j)\)，其中 \(c>0\) 为常数，则期望分布 \(\bar p_i=\alpha_i/\kappa\) 的熵满足
\[
H(\bar p)=O\!\left(\frac{\log\kappa}{\kappa}\right)\xrightarrow[\kappa\to\infty]{}0.
\]

**证明。** 此时
\[
\bar p_j=1-\frac{(B-1)c}{\kappa},\qquad
\bar p_i=\frac c\kappa\;(i\ne j).
\]
熵分成两项：
\[
H(\bar p)=-\bar p_j\log\bar p_j-\sum_{i\ne j}\bar p_i\log\bar p_i.
\]
令 \(x=(B-1)c/\kappa\)，利用 \(-\,(1-x)\log(1-x)=O(x)\)，第一项为 \(O(1/\kappa)\)。第二项为
\[
-(B-1)\frac c\kappa\log\frac c\kappa
=\frac{(B-1)c}{\kappa}\bigl(\log\kappa-\log c\bigr)
=O\!\left(\frac{\log\kappa}{\kappa}\right),
\]
故熵趋于零。

## 定理 4.3（CoT 的探索缺失）

在假设 4.2 下，当 \(\kappa\to\infty\) 时，\(H(p_{\rm CoT})\to0\)，并且几乎处处有
\[
D_{\rm KL}(q_{\rm PR}\Vert p_{\rm CoT})
=\frac{B-1}{B}\log\kappa-\log B
-\frac{(B-1)\log c}{B}+O(\kappa^{-1})\longrightarrow\infty.
\]

**证明。** Dirichlet 大数律给出 \(p_{\rm CoT}\to\bar p\) 几乎处处。KL 散度在概率向量内部连续，因此只需计算
\[
\begin{aligned}
D_{\rm KL}(q_{\rm PR}\Vert\bar p)
&=\sum_{i=1}^B\frac1B\log\frac{1/B}{\bar p_i}\\
&=-\log B-\frac1B\log\!\left(1-\frac{(B-1)c}{\kappa}\right)
-\frac{B-1}{B}\log\frac c\kappa .
\end{aligned}
\]
用 \(\log(1-x)=-x+O(x^2)\) 展开即可得到上式。其主导项是 \(((B-1)/B)\log\kappa\)，故与均匀探索先验的距离发散。结合引理 A.2，显式 CoT 在每一步都几乎只保留一个分支，这解释了它在探索任务上的不足。

## 假设 A.3（潜在状态的收敛与紧致性）

推理过程中，\(\{h_k\}\) 收敛到固定点，或进入一个紧致的吸引集合 \(\mathcal H\)。这使得后续对解码器连续性和最大值的使用有数学依据，也对应实验中 PCA 所显示的有界收敛轨迹。

### 引理 A.4（Coconut 的非退化输出分布）

若 Coconut 等价于定理 4.1 中带有限 \(\beta(k)>0\) 的 CIB 优化，并且假设 A.3 成立，则存在 \(\delta\in(0,1)\)，使所有可达 \(h\in\mathcal H\) 和合法下一 token \(u\) 都满足
\[
\sup_{h\in\mathcal H}\max_{u\in N_{\rm valid}(v)}p(u\mid h)\le1-\delta.
\]

**证明。** 反设上式不成立，则由紧致性与解码器连续性，存在 \(h^\star,u^\star\) 使 \(p(u^\star\mid h^\star)=1\)。这意味着给定 \(h^\star\) 后未来完全确定，因而 \(I_{\rm future}\) 达到最大值 \(I_{\max}(k)\)。

在定理 4.1 的效率前沿
\[
I_{\rm future}=I_{\max}(k)\left(1-e^{-\alpha(k)I_{\rm past}}\right)
\]
上，导数为
\[
\frac{\mathrm dI_{\rm future}}{\mathrm dI_{\rm past}}
=I_{\max}(k)\alpha(k)e^{-\alpha(k)I_{\rm past}}.
\]
只有当 \(I_{\rm past}\to\infty\) 时该导数才趋于零；若在有限 \(I_{\rm past}\) 处达到 \(I_{\max}(k)\)，导数必须为零。可是 CIB 最优性要求该导数等于 \(1/\beta(k)>0\)，而非终止阶段的 \(\beta(k)\) 是有限正数，矛盾。因此输出概率不能达到 1，必存在统一的 \(\delta>0\)。

## 定理 4.5（Latent CoT 的探索能力保证）

在假设 A.3 和引理 A.4 下，存在 \(\delta\in(0,1)\) 与有限常数 \(c_0\)，使
\[
D_{\rm KL}(q_{\rm PR}\Vert p_{\rm Coconut})\le
-\frac12\log\delta-c.
\]
（原文将右端写作 \(-\tfrac12\log\delta-c\)，其中 \(c\) 为与分支数无关的有限常数。）

**证明。** 令合法分支数为 \(B\)。由引理 A.4，每个概率不超过 \(1-\delta\)。在约束 \(\sum_i p_i=1\) 和 \(\max_i p_i\le1-\delta\) 下，要使
\[
D_{\rm KL}(q_{\rm PR}\Vert p)=-\log B-\frac1B\sum_{i=1}^B\log p_i
\]
最大，就应让分布尽可能集中：一个分支取 \(1-\delta\)，其余 \(B-1\) 个各取 \(\delta/(B-1)\)。代入得
\[
D_{\rm KL}\le-\log B-\frac1B\left[\log(1-\delta)+(B-1)\log\frac{\delta}{B-1}\right].
\]
把右侧整理为与 \(B\) 有界的部分加上 \(\frac{B-1}{B}\log(1/\delta)\)。由于 \((B-1)/B\le1\)，得到与 \(B\) 无关的有限上界。其含义是：Coconut 的分布永远不会像高 \(\kappa\) 的 CoT 那样塌缩到单一路径，因此能持续探索。

## 定义 4.6（次决策扰动）

设第 \(k\) 步的干净 logit 向量为 \(l_k^\star\)，加入扰动 \(\varepsilon_k\) 后为 \(l_k=l_k^\star+\varepsilon_k\)。若
\[
\arg\max(l_k^\star+\varepsilon_k)=\arg\max(l_k^\star),
\]
则称 \(\varepsilon_k\) 为次决策扰动：它改变了内部连续状态，却不足以改变立即输出的 token。

## 定理 4.7（CoT 的符号完整性）

设 \(S^\star=(s_1^\star,\ldots,s_M^\star)\) 是无噪声 CoT 轨迹，\(\hat S\) 是每一步加入次决策扰动后的轨迹，则
\[
\Pr[\hat S\ne S^\star]=0.
\]

**证明。** 用归纳法。第 1 步的输入相同，模型前向函数 \(f_\theta\) 确定地产生 \(l_1^\star\)。由于扰动是次决策的，
\[
\hat s_1=\arg\max(l_1^\star+\varepsilon_1)=\arg\max(l_1^\star)=s_1^\star.
\]
假设前 \(k-1\) 步 token 都相同，则传给第 \(k\) 步的离散历史相同，确定性前向函数给出相同的干净 logit：
\[
f_\theta(x,\hat S^{(1:k-1)})=f_\theta(x,S^{\star(1:k-1)})=l_k^\star.
\]
再次使用次决策条件，\(\hat s_k=s_k^\star\)。归纳得到所有 \(k=1,\ldots,M\) 都相同。关键机制是 argmax 将连续状态重新投影到离散 token；每一步都会丢弃不足以改变决策的噪声，因此噪声不会跨步累积。

## 定理 4.8（潜在计算中的误差累积）

设潜在转移为 \(h_k=f_\theta(h_{k-1})+\varepsilon_h^{(k)}\)，其中 \(f_\theta\) 的 Lipschitz 常数为 \(L_F\)，\(\varepsilon_h^{(k)}\overset{\rm iid}{\sim}\mathcal N(0,\sigma^2I_d)\)。令 \(E_k=h_k-h_k^\star\)，且 \(E_0=0\)。则
\[
\mathbb E\|E_M\|_F^2=
\begin{cases}
\displaystyle\frac{1-L_F^{2M}}{1-L_F^2}\,d\sigma^2,&L_F\ne1,\\[6pt]
Md\sigma^2,&L_F=1.
\end{cases}
\]
因此任意 \(M\ge1\) 都有正误差；若 \(L_F>1\)，误差指数增长，即使 \(L_F\le1\)，误差也会随步数累积。

**证明。** 由 Lipschitz 性，
\[
E_k=f_\theta(h_{k-1})-f_\theta(h_{k-1}^\star)+\varepsilon_h^{(k)}.
\]
平方并取期望。噪声独立、零均值，使交叉项为零；同时
\(\|f_\theta(a)-f_\theta(b)\|_2\le L_F\|a-b\|_2\)，故
\[
\mathbb E\|E_k\|_2^2\le L_F^2\mathbb E\|E_{k-1}\|_2^2+d\sigma^2.
\]
迭代该递推式并使用 \(E_0=0\)，得到几何级数
\[
d\sigma^2\sum_{t=0}^{M-1}L_F^{2t},
\]
从而得到分段公式。与定理 4.7 的离散重置相比，连续隐状态没有纠错投影，所以每一步的误差都会留在后续状态中。

## Appendix A.7：归一化准确率函数的推导

为把定理 4.8 的状态误差连接到实验中的准确率曲线，设干净的最终 latent 状态为 \(h_M^\star\)。线性化转移动力学后，多步注入的高斯噪声可合并为
\[
\hat h_M=h_M^\star+\varepsilon_{\rm acc},\qquad
\varepsilon_{\rm acc}\sim\mathcal N(0,\sigma_{\rm eff}^2I_d),
\]
其中 \(\sigma_{\rm eff}^2=\alpha\sigma^2\)，\(\alpha\) 由路径长度和转移函数的 Lipschitz 常数决定。令语言模型头的矩阵为 \(W_U\)，则 logit 噪声为
\[
\hat l=W_U\hat h_M=l^\star+\xi,\qquad
\xi=W_U\varepsilon_{\rm acc}.
\]
因此 \(\xi\) 仍是高斯向量。

设正确 token 为 \(i^\star\)，最强竞争 token 为 \(j^\star\)，干净 logit 间隔为 \(\Delta_l=l_{i^\star}^\star-l_{j^\star}^\star\)。保持正确排序的条件是
\[
\hat l_{i^\star}>\hat l_{j^\star}
\Longleftrightarrow
\xi_{j^\star}-\xi_{i^\star}<\Delta_l.
\]
令 \(\zeta=\xi_{j^\star}-\xi_{i^\star}\)。因为它是高斯向量的线性组合，\(\zeta\sim\mathcal N(0,C^2\sigma^2)\)，其中常数 \(C\) 吸收了 \(W_U\)、路径长度和噪声放大因子。记标准正态分布函数为 \(\Phi\)，则归一化准确率为
\[
A(\sigma)=\Pr(\zeta<\Delta_l)
=\Phi\!\left(\frac{\Delta_l}{C\sigma}\right).
\]
当 \(\sigma\to0\) 时，\(\Delta_l/(C\sigma)\to\infty\)，准确率保持平台；噪声增大后该比值下降，准确率呈单调的 S 形衰减。这也说明鲁棒性由符号指数所诱导的间隔 \(\Delta_l\) 与累计噪声标准差之比决定。


## 定义 4.9（符号指数）

在合法词表 \(V\) 的决策点，令 \(p(u\mid h,x)\) 为模型输出分布。符号指数定义为最大 token 概率
\[
I_S=\max_{u\in V}p(u\mid h,x)\in[1/|V|,1].
\]
\(I_S\) 接近 1 表示模型几乎确定地提交一个 token；较小的 \(I_S\) 表示概率分散在多个候选上。

## 定义 4.10（Logit 决策间隔）

设最可能和第二可能 token 的 logits 分别为 \(l_{i^\star}\) 与 \(l_{j^\star}\)，定义
\[
\Delta_l=l_{i^\star}-l_{j^\star}.
\]
它是离散决策抵抗 logit 噪声的安全间隔。

## 定理 4.11（符号稳定性）

符号指数与决策间隔满足
\[
\Delta_l\ge\log\left(\frac{I_S}{1-I_S}\right).
\]

**证明。** softmax 给出
\[
\frac{p_{i^\star}}{p_{j^\star}}=e^{l_{i^\star}-l_{j^\star}}=e^{\Delta_l},\qquad
\Delta_l=\log p_{i^\star}-\log p_{j^\star}.
\]
由定义 \(p_{i^\star}=I_S\)。其余 token 的总概率为 \(1-I_S\)，所以第二大概率至多为总和：\(p_{j^\star}\le1-I_S\)。因为 \(-\log\) 单调递减，\(-\log p_{j^\star}\ge-\log(1-I_S)\)。代回即得
\[
\Delta_l\ge\log I_S-\log(1-I_S)=\log\frac{I_S}{1-I_S}.
\]
这说明 \(I_S\) 对数值稳定性的作用是直接的：\(I_S=0.99\) 时下界约为 \(4.6\)，而 \(I_S=0.6\) 时仅约为 \(0.4\)。

## 定理 4.12（探索-执行权衡）

对有 \(B\) 个合法选项的决策，任意分布 \(p\) 若其符号指数为 \(I_S=\max_i p_i\)，则
\[
D_{\rm KL}(q_{\rm PR}\Vert p)\ge
\log B+I_S\log I_S
+(1-I_S)\log\left(\frac{1-I_S}{B-1}\right).
\]
右端在 \(I_S=1/B\)（完全均匀）时最小；当 \(I_S\to1\) 时增大。因而提高 \(I_S\) 虽增大定理 4.11 的安全间隔，却必然损害探索。

**证明。** 直接展开均匀先验与模型分布的 KL 散度：
\[
D_{\rm KL}(q_{\rm PR}\Vert p)=-\log B-\frac1B\sum_{i=1}^B\log p_i.
\]
固定最大概率为 \(I_S\)，设对应分量为 \(p_{i^\star}=I_S\)，其余概率总和为 \(1-I_S\)。由于 \(\log\) 是凹函数，Jensen 不等式说明在其余分量均匀时，\(\sum_i\log p_i\) 最大，即 \(p_i=(1-I_S)/(B-1)\;(i\ne i^\star)\)。把这个最大值代回 KL 式，就得到所需下界。这个证明把稳定性与探索性压缩到同一个可计算指标 \(I_S\) 上。

## 定理 5.1（无课程训练必然失败）

设无课程训练使用的数据集 \(D_{\rm nc}\) 来自有偏 latent 分布 \(P_{\rm biased}\)。若其任务成功率比专家策略 \(\theta^\star\) 低至少 \(\Delta>0\)：
\[
R(P_{\rm biased})\le R(\theta^\star)-\Delta,
\]
则在该数据上训练得到的最大似然估计 \(\hat\theta_{\rm MLE}\) 满足
\[
R(\hat\theta_{\rm MLE})\le R(\theta^\star)-C(\Delta),
\]
其中 \(C(\Delta)>0\) 与偏差有关，与数据集规模无关。因此偏差导致的性能损失不会因增加数据而消失。

**证明。** 构造三维 latent 空间中的反例：正确状态 \(h_{\rm expert}\) 的特征为 \([1,0,0]^\top\)，shortcut 状态 \(h_{\rm shortcut}\) 的特征为 \([0,1,1]^\top\)，无关状态 \(h_{\rm bad}\) 的特征为 \([0,1,0]^\top\)。只在 \(h_{\rm expert}\) 时取值函数 \(V(h)=1\)，否则为 0，因此 \(R(\theta)=P_\theta(h_{\rm expert})\)。

令专家参数 \(\theta^\star=[10,0,0]^\top\)。softmax 下
\[
R(\theta^\star)=\frac{e^{10}}{e^{10}+1+1}\approx1.
\]
现在令偏置数据完全由 shortcut 状态组成：\(P_{\rm biased}(h_{\rm shortcut})=1\)，于是 \(R(P_{\rm biased})=0\)，满足定理条件且间隔约为 1。

在该数据上，MLE 只需提高 shortcut 的得分 \(\theta_2+\theta_3\)。随着样本量增大，最优参数可趋向 \([0,K,K]^\top\)，\(K\to\infty\)，从而
\[
P_{\hat\theta_{\rm MLE}}(h_{\rm shortcut})\to1,\qquad
P_{\hat\theta_{\rm MLE}}(h_{\rm expert})\to0.
\]
所以 \(R(\hat\theta_{\rm MLE})\to0\)，始终与接近 1 的专家成功率保持正差距。该反例说明自生成 shortcut latent 会把模型锁在次优策略上。

## 定理 5.2（使用课程训练的可证明成功）

在标准统计学习条件下，课程数据集 \(D_c\) 含有 \(n\) 个由专家 latent 策略生成的独立样本。以最大似然训练得到 \(\hat\theta\)，则以至少 \(1-\delta\) 的概率
\[
R(\hat\theta)\ge R(\theta^\star)-
O\!\left(\sqrt{\frac{d\log n+\log(1/\delta)}{n}}\right).
\]
因此 \(n\to\infty\) 时性能差距消失。课程的作用是让训练分布与专家 latent 分布一致，而不是让模型从自身早期的 shortcut 状态学习。

### 附录中的模仿学习解释

令 \(P_{\theta^\star}(h\mid x)\) 为专家 latent 策略。定理 4.1 表明，最优编码器 \(E_{\theta^\star}\) 把专家前缀 \(S_{\rm past}^\star\) 映射成预测未来所需的最小充分统计量
\(h=E_{\theta^\star}(S_{\rm past}^\star)\)。于是可定义隐含专家策略
\[
P_{\theta^\star}(h\mid x)=\mathop{\rm Law}\bigl(E_{\theta^\star}(S_{\rm past}^\star)\mid x\bigr).
\]
数据处理不等式给出
\[
I(S_{\rm past}^\star;S_{\rm future}^\star\mid x)
\ge I(E_\theta(S_{\rm past}^\star);S_{\rm future}^\star\mid x),
\]
而最优编码器取等。此时预测未来 token 的 Coconut 损失只在编码器诱导的 latent 分布与 \(P_{\theta^\star}\) 不一致时增加，因此在专家轨迹上最小化 Coconut 损失，等价于在由 \(h_i=E_{\theta^\star}(S_{{\rm past},i}^\star)\) 构造的隐式数据集上做 MLE。这给出了把课程训练放入模仿学习框架的依据。

### 引理 A.5（向量鞅的自归一化界）

设 \(\{\mathcal F_i\}_{i=0}^n\) 是滤过，\(g_i\in\mathbb R^d\) 满足 \(g_i\) 可由 \(\mathcal F_i\) 测量、\(\mathbb E[g_i\mid\mathcal F_{i-1}]=0\)，且对任意单位向量 \(v\)，\(\langle v,g_i\rangle\) 条件上是 \(\sigma\)-次高斯的：
\[
\mathbb E[e^{\lambda\langle v,g_i\rangle}\mid\mathcal F_{i-1}]
\le e^{\lambda^2\sigma^2/2}.
\]
给定正定矩阵 \(V\)，定义
\[
V_n=V+\sum_{i=1}^ng_ig_i^\top,\qquad G_n=\sum_{i=1}^ng_i.
\]
则任意 \(\delta\in(0,1)\)，以至少 \(1-\delta\) 的概率有
\[
\|G_n\|_{V_n^{-1}}^2
\le2\sigma^2\log\left(\frac{\det(V_n)^{1/2}}{\det(V)^{1/2}\delta}\right).
\]
该结果把随机梯度的大小按其自身协方差归一化，是后续高概率参数误差界的核心工具。

### 引理 A.6（参数估计的置信集合）

设课程数据 \(D_c=\{(x_i,h_i)\}_{i=1}^n\) 独立采自专家分布 \(P_{\theta^\star}\)，并令
\[
\hat\theta_{\rm MLE}=\arg\max_\theta\sum_{i=1}^n\log P_\theta(h_i\mid x_i).
\]
假设：

1. 特征有界：\(\|\phi(x,h)\|_2\le L\)。
2. 期望负对数似然 \(L(\theta)\) 对参数是 \(\mu_{\min}\)-强凸的，且 Fisher 信息 \(I(\theta)\succeq\mu_{\min}I\)。
3. 真参数处的 score 是零均值、\(\sigma^2\)-次高斯向量。
4. 参数位于紧集 \(B=\{\theta:\|\theta\|_2\le B\}\)。

记经验 Hessian 为
\[
\hat H_n=\frac1n\sum_{i=1}^n
\nabla_\theta^2[-\log P_{\hat\theta_{\rm MLE}}(h_i\mid x_i)].
\]
则存在只依赖于 \(L,\sigma,\mu_{\min},B\) 的常数 \(C\)，使以至少 \(1-\delta\) 的概率
\[
\|\hat\theta_{\rm MLE}-\theta^\star\|_{\hat H_n}^2
\le\beta_n^2(\delta),\qquad
\beta_n^2(\delta)=C\frac{d\log n+\log(1/\delta)}n.
\]

**证明。** 记经验风险 \(L_n(\theta)=n^{-1}\sum_i\ell_i(\theta)\)，其中 \(\ell_i(\theta)=-\log P_\theta(h_i\mid x_i)\)。MLE 的最优性和凸性给出
\[
L_n(\hat\theta_{\rm MLE})\le L_n(\theta^\star).
\]
由于 \(L(\theta)\) 在 \(\theta^\star\) 处最小且强凸，
\[
L(\hat\theta_{\rm MLE})-L(\theta^\star)\ge
\frac{\mu_{\min}}2\|\hat\theta_{\rm MLE}-\theta^\star\|_2^2.
\]
另一方面，把经验风险写成期望风险加经验过程，可将参数误差控制为经验 score 的上确界。令
\(g_i=\nabla_\theta\ell_i(\theta^\star)\)，则 \(\{g_i\}\) 是零均值向量鞅。对
\(\nabla L_n(\hat\theta_{\rm MLE})=0\) 在 \(\theta^\star\) 附近作一阶 Taylor 展开：
\[
0=\nabla L_n(\theta^\star)+\hat H_n^\circ(\hat\theta_{\rm MLE}-\theta^\star),
\]
其中 \(\hat H_n^\circ\) 是两参数之间线段上的平均 Hessian。因此
\[
\hat\theta_{\rm MLE}-\theta^\star=-(\hat H_n^\circ)^{-1}
\nabla L_n(\theta^\star).
\]

取 \(V=\lambda I\)（\(\lambda>0\)）并应用引理 A.5，得到高概率 score 界。利用特征有界性控制行列式项，再用矩阵集中不等式说明 \(\hat H_n^\circ\) 和 \(\hat H_n\) 都接近 \(I(\theta^\star)\)，于是
\[
\|\hat\theta_{\rm MLE}-\theta^\star\|_{\hat H_n}^2
\le C\frac{d\log n+\log(1/\delta)}n.
\]
这就是所述置信集合。证明中唯一的概率工具是自归一化鞅界；强凸性把 score 的随机波动转换成参数距离。

**定理 5.2 的证明。** 分三步进行。

**第一步：KL 界。** 对数线性模型中，令 \(\Delta=\hat\theta-\theta^\star\)。在 \(\theta^\star\) 附近对 \(\log P_{\hat\theta}(h\mid x)\) 作二阶 Taylor 展开。由于真参数处 score 的期望为零，得到
\[
\mathbb E_{x\sim\rho}\!\left[D_{\rm KL}(P_{\theta^\star}\Vert P_{\hat\theta})\right]
=\frac12\Delta^\top I(\theta^\star)\Delta+\text{高阶项}.
\]
引理 A.6 保证高概率下 \(\Delta\) 很小，且经验 Hessian 集中到 Fisher 信息，因此存在常数 \(C\) 使
\[
\mathbb E_{x\sim\rho}\!\left[D_{\rm KL}(P_{\theta^\star}\Vert P_{\hat\theta})\right]\le
C\frac{d\log n+\log(1/\delta)}n.
\]

**第二步：KL 转为全变差距离。** Pinsker 不等式给出
\[
{\rm TV}(P,Q)\le\sqrt{\frac12D_{\rm KL}(P\Vert Q)}.
\]
再用 Jensen 不等式，得到
\[
\mathbb E_x[{\rm TV}(P_{\theta^\star},P_{\hat\theta})]
=O\left(\sqrt{\frac{d\log n+\log(1/\delta)}n}\right).
\]

**第三步：全变差距离控制成功率。** 任务成功函数 \(V(h)\in\{0,1\}\) 有界，因此任意两个策略的期望差不超过它们的 TV 距离：
\[
\begin{aligned}
|R(\hat\theta)-R(\theta^\star)|
&=\left|\mathbb E_x\left[\mathbb E_{P_{\hat\theta}}V(h)-\mathbb E_{P_{\theta^\star}}V(h)\right]\right|\\
&\le\mathbb E_x[{\rm TV}(P_{\theta^\star},P_{\hat\theta})].
\end{aligned}
\]
代入第二步的界，并取成功率的下界，得到
\[
R(\hat\theta)\ge R(\theta^\star)-
O\left(\sqrt{\frac{d\log n+\log(1/\delta)}n}\right).
\]
故课程训练下，模型策略在高概率意义上收敛到专家策略；其性能误差随样本量按近似 \(n^{-1/2}\) 下降。

## 总结性的解释

符号指数 \(I_S\) 是全文的统一调节量。显式 CoT 的高 \(I_S\) 带来大的 logit 间隔和离散重置，所以执行稳定，却根据定理 4.12 偏离均匀探索；Latent CoT 的低 \(I_S\) 保留多个路径，满足定理 4.5 的有限探索散度，却因定理 4.8 的连续误差累积而牺牲精确计算。课程学习先用高确定性的显式 token 轨迹提供正确梯度，再逐步过渡到低确定性的 latent 表示，从而同时解决分布错配和训练收敛问题。
